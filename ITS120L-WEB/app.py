import random
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
import mysql.connector
from werkzeug.security import check_password_hash, generate_password_hash
from flask_mail import Mail, Message
from dotenv import load_dotenv
load_dotenv()
from authlib.integrations.flask_client import OAuth
from datetime import datetime
import pytz
import joblib
import numpy as np
from weather_api import get_weather_data
from flask import send_file
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet


app = Flask(__name__)
app.secret_key = "supersecretkey"

# --- OAuth config ---
oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id='812471008749-s39tdjq8v9dgu85j8updhi9be8sbm93q.apps.googleusercontent.com',
    client_secret='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',
    access_token_url='https://accounts.google.com/o/oauth2/token',
    access_token_params=None,
    authorize_url='https://accounts.google.com/o/oauth2/auth',
    authorize_params=None,
    api_base_url='https://www.googleapis.com/oauth2/v1/',
    client_kwargs={'scope': 'openid email profile'}
)

# --- Google Login route ---
@app.route("/login_google")
def login_google():
    redirect_uri = url_for('google_callback', _external=True)
    return google.authorize_redirect(redirect_uri)

# --- Google OAuth callback ---
@app.route("/google_callback")
def google_callback():
    token = google.authorize_access_token()
    resp = google.get('userinfo')  # get user info
    user_info = resp.json()
    email = user_info['email']
    name = user_info['name']

    # Check if user exists in DB
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
    user_row = cursor.fetchone()

    if not user_row:
        # New Google user → create in DB
        cursor.execute("""
            INSERT INTO users (firstName, lastName, email, userPassword, userStatus, roleID)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (name.split()[0], "GoogleUser", email, "", "active", 1))
        conn.commit()
        cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
        user_row = cursor.fetchone()

    cursor.close()
    conn.close()

    # Log in user
    user_obj = User(user_row["userID"], user_row["email"], user_row["userPassword"])
    login_user(user_obj)

    return redirect(url_for("dashboard"))

# --- Email config ---
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'noreply.weatherwise@gmail.com'
app.config['MAIL_PASSWORD'] = 'wdkl vnvs fqnn umpw'
mail = Mail(app)

# --- Flask-Login config ---
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

# --- MySQL connection ---
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="new_password",
        database="weatherwise"
    )


# --- User model ---
class User(UserMixin):
    def __init__(self, id, email, password):
        self.id = id
        self.email = email
        self.password = password

@login_manager.user_loader
def load_user(userID):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE userID=%s", (userID,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if row:
        return User(row['userID'], row['email'], row['userPassword'])
    return None

# --- Routes ---
@app.route("/")
def index():
    return redirect(url_for("home"))

@app.route("/home")
def home():
    return render_template("home.html")

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/contact")
def contact():
    return render_template("contact.html")

@app.route("/forgot")
def forgot():
    return render_template("forgot.html")

# --- SIGNUP ---
@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        first_name = request.form.get("firstName")
        last_name = request.form.get("lastName")
        email = request.form.get("email")
        password = request.form.get("password")

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Hash the password before storing
        hashed_password = generate_password_hash(password)

        # Insert user as pending
        cursor.execute("""
            INSERT INTO users (firstName, lastName, email, userPassword, userStatus, roleID)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (first_name, last_name, email, hashed_password, "pending", 1))
        conn.commit()

        # Generate + store code
        verification_code = str(random.randint(100000, 999999))
        cursor.execute("UPDATE users SET verification_code=%s WHERE email=%s", (verification_code, email))
        conn.commit()

        # Store email for verification
        session["email"] = email

        # Send email
        msg = Message("WeatherWise Email Verification",
                      sender=app.config["MAIL_USERNAME"],
                      recipients=[email])
        msg.body = f"Your verification code is {verification_code}. Please enter it to activate your account."
        mail.send(msg)

        flash("Verification code sent! Please check your email.")
        cursor.close()
        conn.close()

        return redirect(url_for("verify"))

    return render_template("signup.html")

# --- VERIFY CODE ---
@app.route("/verify", methods=["GET", "POST"])
def verify():
    if request.method == "POST":
        code = request.form.get("workspace")  # matches input name in HTML
        email = session.get("email")

        if not email:
            flash("Session expired. Please sign up again.")
            return redirect(url_for("signup"))

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT verification_code FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()

        if user and user["verification_code"] == code:
            cursor.execute("""
                UPDATE users 
                SET userStatus='active', verification_code=NULL 
                WHERE email=%s
            """, (email,))
            conn.commit()
            flash("✅ Account verified! Redirecting to dashboard...")
            session.pop("email", None)

            # Auto-login and redirect
            cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
            user_data = cursor.fetchone()
            if user_data:
                user_obj = User(user_data["userID"], user_data["email"], user_data["userPassword"])
                login_user(user_obj)
            cursor.close()
            conn.close()

            return redirect(url_for("dashboard"))
        else:
            flash("❌ Invalid verification code. Please try again.")
            cursor.close()
            conn.close()

    return render_template("2fa.html")

# --- RESEND CODE ---
@app.route("/resend_code", methods=["GET"])
def resend_code():
    email = session.get("email")  # use stored email from signup

    if not email:
        flash("Session expired. Please sign up again.")
        return redirect(url_for("signup"))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # 🔹 Generate a new code
    new_code = str(random.randint(100000, 999999))

    # 🔹 Update the user’s verification code in the database
    cursor.execute("UPDATE users SET verification_code=%s WHERE email=%s", (new_code, email))
    conn.commit()

    # 🔹 Send the new email
    msg = Message("WeatherWise Verification Code (Resent)",
                  sender=app.config["MAIL_USERNAME"],
                  recipients=[email])
    msg.body = f"Your new verification code is: {new_code}. Please use this to activate your account."
    mail.send(msg)

    cursor.close()
    conn.close()

    flash("✅ A new verification code has been sent to your email!")
    return redirect(url_for("verify"))

# --- LOGIN ---
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
        user_row = cursor.fetchone()
        cursor.close()
        conn.close()

        if user_row and check_password_hash(user_row["userPassword"], password):
            user = User(user_row["userID"], user_row["email"], user_row["userPassword"])
            login_user(user)
            return redirect(url_for("dashboard"))
        flash("Invalid email or password")
    return render_template("login2.html")

# --- DASHBOARD ---
@app.route("/dashboard")
@login_required
def dashboard():
    return render_template("dashboard.html")

# --- INVENTORY ---
@app.route('/inventory')
@login_required
def inventory():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT 
            inventoryID,
            productID,
            supplierID,
            prodName,
            category,
            quantity,
            unit,
            minThreshold,
            maxThreshold,
            lastUpdated
        FROM inventory
        ORDER BY inventoryID DESC
    """
    cursor.execute(query)
    data = cursor.fetchall()

    cursor.close()
    conn.close()

    return render_template("inventory.html", inventory=data)

PH_TZ = pytz.timezone('Asia/Manila')

# --- GET INVENTORY (for dynamic refresh) ---
@app.route("/get_inventory")
def get_inventory():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("""
        SELECT 
            inventoryID,
            productID,
            supplierID,
            prodName AS productName,
            category,
            quantity,
            unit,
            minThreshold,
            maxThreshold,
            lastUpdated
        FROM inventory
        ORDER BY inventoryID DESC
    """)
    
    data = cursor.fetchall()
    cursor.close()
    conn.close()

    # Convert lastUpdated to PH time strings
    for item in data:
        if item['lastUpdated']:
            item['lastUpdated'] = item['lastUpdated'].astimezone(PH_TZ).strftime('%Y-%m-%d %H:%M:%S')

    return jsonify(data)


# --- ADD INVENTORY ---
@app.route('/add_inventory', methods=['POST'])
def add_inventory():
    data = request.get_json()

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # 1️⃣ Get the current max productID
    cursor.execute("SELECT MAX(productID) AS max_id FROM inventory")
    result = cursor.fetchone()
    next_product_id = (result['max_id'] or 0) + 1  # if table empty, start at 1

    # 2️⃣ Insert new inventory row with manually incremented productID
    insert_query = """
        INSERT INTO inventory 
        (productID, prodName, category, quantity, unit, minThreshold, maxThreshold, supplierID)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """
    cursor.execute(insert_query, (
        next_product_id,
        data.get('prodName'),
        data.get('category'),
        data.get('quantity'),
        data.get('unit'),
        data.get('minThreshold'),
        data.get('maxThreshold'),
        data.get('supplierID')
    ))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({'message': 'Inventory item added successfully', 'productID': next_product_id})



# --- DELETE INVENTORY ---
@app.route("/delete_inventory/<int:inventoryID>", methods=["DELETE"])
def delete_inventory(inventoryID):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM inventory WHERE inventoryID=%s", (inventoryID,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Deleted successfully"})


# --- UPDATE INVENTORY ---
@app.route("/update_inventory/<int:inventoryID>", methods=["PUT"])
def update_inventory(inventoryID):
    data = request.get_json()

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    update_query = """
        UPDATE inventory
        SET prodName=%s, category=%s, quantity=%s, unit=%s,
            minThreshold=%s, maxThreshold=%s, supplierID=%s
        WHERE inventoryID=%s
    """
    cursor.execute(update_query, (
        data.get('prodName'),
        data.get('category'),
        data.get('quantity'),
        data.get('unit'),
        data.get('minThreshold'),
        data.get('maxThreshold'),
        data.get('supplierID'),
        inventoryID
    ))
    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({'message': 'Inventory item updated successfully'})


# --- FORECASTING & REPORTS ---
@app.route("/forecasting-report")
@login_required
def forecasting_report():
    return render_template("forecasting-report.html")

# --- SUPPLIERS ---
@app.route('/suppliers')
@login_required
def suppliers():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT 
            supplierID,
            supplierName,
            contactPerson,
            email,
            phone,
            address
        FROM supplier
        ORDER BY supplierID DESC
    """
    cursor.execute(query)
    data = cursor.fetchall()

    cursor.close()
    conn.close()

    return render_template("suppliers.html", suppliers=data)



# --- GET SUPPLIERS ---
@app.route("/get_suppliers")
@login_required
def get_suppliers():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT supplierID, supplierName, contactPerson, email, phone, address
        FROM supplier
        ORDER BY supplierID DESC
    """)
    suppliers = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(suppliers)

# --- ADD SUPPLIER ---
@app.route('/add_supplier', methods=['POST'])
@login_required
def add_supplier():
    data = request.get_json()
    supplier_name = data.get('supplierName')
    contact_person = data.get('contactPerson')
    email = data.get('email')
    phone = data.get('phone')   
    address = data.get('address')

    if not supplier_name or not contact_person or not email:
        return jsonify({'error': 'Missing required fields'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        INSERT INTO supplier (supplierName, contactPerson, email, phone, address)
        VALUES (%s, %s, %s, %s, %s)
    """
    cursor.execute(query, (supplier_name, contact_person, email, phone, address))
    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({'message': 'Supplier added successfully'}), 201

# --- UPDATE SUPPLIER ---
@app.route("/update_supplier/<int:supplierID>", methods=["PUT"])
@login_required
def update_supplier(supplierID):
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE supplier
        SET supplierName=%s, contactPerson=%s, email=%s, phone=%s, address=%s
        WHERE supplierID=%s
    """, (data["supplierName"], data["contactPerson"], data["email"], data["phone"], data["address"], supplierID))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Supplier updated successfully"})

# --- DELETE SUPPLIER ---
@app.route("/delete_supplier/<int:supplierID>", methods=["DELETE"])
@login_required
def delete_supplier(supplierID):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM supplier WHERE supplierID=%s", (supplierID,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Supplier deleted successfully"})

# --- ORDERS ---
@app.route("/orders")
@login_required
def orders():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT 
            s.scheduleID,
            i.productID,
            sup.supplierID,
            i.prodName,
            i.category,
            s.orderQuantity,
            s.buyingPrice,
            s.deliveryDate,
            s.schedStatus
        FROM scheduling s
        JOIN inventory i ON s.productID = i.productID
        JOIN supplier sup ON s.supplierID = sup.supplierID
        ORDER BY s.scheduleID DESC
    """
    cursor.execute(query)
    data = cursor.fetchall()

    cursor.close()
    conn.close()
    return render_template("orders.html")

# --- Order History (JSON) ---
@app.route('/order_history', methods=['GET'])
@login_required
def order_history():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT s.scheduleID, s.productID, i.prodName, s.supplierID, s.createdDate
        FROM scheduling s
        LEFT JOIN inventory i ON s.productID = i.productID  -- LEFT JOIN to handle missing inventory
        ORDER BY s.createdDate DESC
        LIMIT 200
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    # Convert datetimes to ISO strings (JSON-friendly)
    for r in rows:
        if r.get('createdDate'):
            r['createdDate'] = r['createdDate'].strftime('%Y-%m-%d %H:%M:%S')
    return jsonify(rows)


# --- Load all schedules ---
@app.route('/load_schedules', methods=['GET'])
def load_schedules():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT s.scheduleID, i.productID, sup.supplierID, i.prodName, i.category,
               s.orderQuantity, s.buyingPrice, s.deliveryDate, s.schedStatus
        FROM scheduling s
        JOIN inventory i ON s.productID = i.productID
        JOIN supplier sup ON s.supplierID = sup.supplierID
        ORDER BY s.scheduleID DESC
    """)
    schedules = cursor.fetchall()
    cursor.close()
    conn.close()

    columns = ['scheduleID', 'productID', 'supplierID', 'prodName', 'category',
               'orderQuantity', 'buyingPrice', 'deliveryDate', 'schedStatus']
    results = [dict(zip(columns, row)) for row in schedules]
    return jsonify(results)


# --- Add new schedule ---
@app.route('/add_schedule', methods=['POST'])
def add_schedule():
    try:
        data = request.get_json(force=True)
        print("Received JSON:", data)

        conn = get_db_connection()
        cursor = conn.cursor()

        productID = int(data['productID'])
        supplierID = int(data['supplierID'])
        orderQuantity = int(data['orderQuantity'])
        buyingPrice = float(data['buyingPrice'])
        schedStatus = "On the way"

        # --- Fix date format ---
        raw_date = data.get('deliveryDate', '')
        try:
            if '/' in raw_date:
                # Convert DD/MM/YYYY to YYYY-MM-DD
                deliveryDate = datetime.strptime(raw_date, "%d/%m/%Y").strftime("%Y-%m-%d")
            else:
                deliveryDate = raw_date
        except ValueError:
            print("⚠️ Invalid date format, using raw value:", raw_date)
            deliveryDate = raw_date

        cursor.execute("""
            INSERT INTO scheduling 
            (productID, supplierID, orderQuantity, buyingPrice, deliveryDate, schedStatus)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (productID, supplierID, orderQuantity, buyingPrice, deliveryDate, schedStatus))
        conn.commit()

        cursor.close()
        conn.close()
        print("Schedule added successfully")
        return jsonify({"message": "Schedule added successfully"}), 201

    except Exception as e:
        print("Add schedule error:", e)
        return jsonify({"error": str(e)}), 500




# --- Update existing schedule ---
@app.route('/update_schedule/<int:scheduleID>', methods=['PUT'])
def update_schedule(scheduleID):
    try:
        data = request.get_json(force=True)
        print("Received update JSON:", data)

        conn = get_db_connection()
        cursor = conn.cursor()

        # Default status if not provided
        schedStatus = data.get('schedStatus', 'On the way')

        # --- Fix date format ---
        raw_date = data.get('deliveryDate', '')
        try:
            if '/' in raw_date:
                deliveryDate = datetime.strptime(raw_date, "%d/%m/%Y").strftime("%Y-%m-%d")
            else:
                deliveryDate = raw_date
        except ValueError:
            print("Invalid date format, using raw value:", raw_date)
            deliveryDate = raw_date

        cursor.execute("""
            UPDATE scheduling
            SET productID=%s, supplierID=%s, orderQuantity=%s, buyingPrice=%s,
                deliveryDate=%s, schedStatus=%s
            WHERE scheduleID=%s
        """, (
            int(data['productID']),
            int(data['supplierID']),
            int(data['orderQuantity']),
            float(data['buyingPrice']),
            deliveryDate,
            schedStatus,
            scheduleID
        ))

        conn.commit()
        cursor.close()
        conn.close()
        print("Schedule updated successfully")
        return jsonify({'message': 'Schedule updated successfully'}), 200

    except Exception as e:
        print("Update schedule error:", e)
        return jsonify({"error": str(e)}), 500



# --- Delete schedule ---
@app.route('/delete_schedule/<int:scheduleID>', methods=['DELETE'])
def delete_schedule(scheduleID):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM scheduling WHERE scheduleID = %s", (scheduleID,))
    conn.commit()
    cursor.close()
    return jsonify({'message': 'Schedule deleted successfully'})

# --- Mark order as Delivered ---
@app.route('/mark_delivered/<int:scheduleID>', methods=['POST'])
def mark_delivered(scheduleID):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)


    cursor.execute("SELECT productID, orderQuantity FROM scheduling WHERE scheduleID = %s", (scheduleID,))
    order = cursor.fetchone()

    if not order:
        cursor.close()
        conn.close()
        return jsonify({'message': 'Order not found'}), 404

    product_id = order['productID']
    order_quantity = order['orderQuantity']

    # Update status in scheduling table
    cursor.execute("""
        UPDATE scheduling SET schedStatus = 'Delivered'
        WHERE scheduleID = %s
    """, (scheduleID,))

    # ✅ Check if product already exists in inventory
    cursor.execute("SELECT quantity FROM inventory WHERE productID = %s", (product_id,))
    existing_inventory = cursor.fetchone()

    if existing_inventory:
        # 🔹 If product already exists, add the quantity
        new_quantity = existing_inventory['quantity'] + order_quantity
        cursor.execute("UPDATE inventory SET quantity = %s WHERE productID = %s", (new_quantity, product_id))
    else:
        # 🔹 If new product, insert directly into inventory with default/null unit
        unit = None  # or 'pcs' if you prefer a default
        cursor.execute("""
            INSERT INTO inventory (productID, quantity, unit, minThreshold, maxThreshold)
            VALUES (%s, %s, %s, 0, 0)
        """, (product_id, order_quantity, unit))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({'message': 'Order marked as Delivered and inventory updated successfully'}), 200




# --- Mark order as Returned ---
@app.route('/mark_returned/<int:scheduleID>', methods=['POST'])
def mark_returned(scheduleID):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # ✅ Fetch productID and quantity from the scheduling table
    cursor.execute("SELECT productID, orderQuantity FROM scheduling WHERE scheduleID = %s", (scheduleID,))
    order = cursor.fetchone()

    if not order:
        cursor.close()
        conn.close()
        return jsonify({'message': 'Order not found'}), 404

    product_id = order['productID']
    order_quantity = order['orderQuantity']

    # ✅ Update status in scheduling table
    cursor.execute("""
        UPDATE scheduling SET schedStatus = 'Returned'
        WHERE scheduleID = %s
    """, (scheduleID,))

    # ✅ Subtract from inventory if exists
    cursor.execute("SELECT quantity FROM inventory WHERE productID = %s", (product_id,))
    existing_inventory = cursor.fetchone()

    if existing_inventory:
        new_quantity = max(0, existing_inventory['quantity'] - order_quantity)
        cursor.execute("UPDATE inventory SET quantity = %s WHERE productID = %s", (new_quantity, product_id))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({'message': 'Order marked as Returned and inventory updated successfully'}), 200


# --- Mark order as On the Way ---
@app.route('/mark_ontheway/<int:scheduleID>', methods=['POST'])
def mark_ontheway(scheduleID):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # ✅ Fetch productID and quantity from scheduling table
    cursor.execute("SELECT productID, orderQuantity FROM scheduling WHERE scheduleID = %s", (scheduleID,))
    order = cursor.fetchone()

    if not order:
        cursor.close()
        conn.close()
        return jsonify({'message': 'Order not found'}), 404

    product_id = order['productID']
    order_quantity = order['orderQuantity']

    # ✅ Update scheduling status
    cursor.execute("""
        UPDATE scheduling SET schedStatus = 'On the way'
        WHERE scheduleID = %s
    """, (scheduleID,))

    # ✅ No inventory adjustment on reset
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({'message': 'Order marked as On the way successfully'}), 200



# --- MANAGE STORE ---
@app.route("/mngstore")
@login_required
def mngstore():
    return render_template("mngstore.html")

# --- GET STORE PROFILE (from users table) ---
@app.route("/get_store_profile")
@login_required
def get_store_profile():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT firstName, lastName, email AS emailAddress,
               storeName, storeType, storeCode,
               branchLocation, fullAddress, contactNumber
        FROM users
        WHERE userID = %s
    """, (current_user.id,))
    data = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify(data or {})


# --- UPDATE STORE PROFILE ---
@app.route("/update_store_profile", methods=["POST"])
@login_required
def update_store_profile():
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE users
        SET firstName=%s, lastName=%s,
            storeName=%s, storeType=%s, storeCode=%s,
            branchLocation=%s, fullAddress=%s, contactNumber=%s
        WHERE userID=%s
    """, (
        data.get("firstName"),
        data.get("lastName"),
        data.get("storeName"),
        data.get("storeType"),
        data.get("storeCode"),
        data.get("branchLocation"),
        data.get("fullAddress"),
        data.get("contactNumber"),
        current_user.id
    ))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Store information saved successfully"})


@app.route("/reset_store", methods=["POST"])
@login_required
def reset_store():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE users
        SET storeName=NULL, storeType=NULL, storeCode=NULL,
            branchLocation=NULL, fullAddress=NULL,
            contactNumber=NULL
        WHERE userID=%s
    """, (current_user.id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Store settings reset to default."})


from flask import send_file
import json
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from datetime import datetime


@app.route("/export_store_data", methods=["GET"])
@login_required
def export_store_data():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # fetch store info tied to current logged-in user
    cursor.execute("""
        SELECT firstName, lastName, email, storeName, storeType, storeCode,
               branchLocation, fullAddress, contactNumber
        FROM users
        WHERE userID = %s
    """, (current_user.id,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if not user or not user["storeName"]:
        return jsonify({"error": "No store data found for this user."}), 404

    # --- Build PDF ---

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("<b>WeatherWise Store Profile Report</b>", styles["Title"]))
    story.append(Spacer(1, 12))

    info = [
        ["Owner", f"{user['firstName']} {user['lastName']}"],
        ["Email", user["email"]],
        ["Store Name", user.get("storeName") or "—"],
        ["Store Type", user.get("storeType") or "—"],
        ["Store Code", user.get("storeCode") or "—"],
        ["Branch / Location", user.get("branchLocation") or "—"],
        ["Full Address", user.get("fullAddress") or "—"],
        ["Contact Number", user.get("contactNumber") or "—"],
        ["Export Date", datetime.now().strftime("%B %d, %Y, %I:%M %p")]
    ]

    table = Table(info, colWidths=[2.5 * inch, 4.5 * inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.25, colors.grey)
    ]))
    story.append(table)

    story.append(Spacer(1, 12))
    story.append(Paragraph("Generated by WeatherWise System", styles["Italic"]))

    doc.build(story)
    buffer.seek(0)

    filename = f"WeatherWise_StoreProfile_{user.get('storeCode') or 'no_code'}.pdf"

    return send_file(
        buffer,
        as_attachment=True,
        download_name=filename,
        mimetype="application/pdf"
    )

# --- LOGOUT ---
@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("login"))

# --- AI FORECAST PREDICTION ---
@app.route("/predict_ai", methods=["POST"])
@login_required
def predict_ai():
    try:
        data = request.get_json()
        city = data.get("city", "Manila")

        # --- Load models ---
        surplus_model = joblib.load("surplus_predictor.pkl")
        deficit_model = joblib.load("deficit_predictor.pkl")
        le = joblib.load("weather_encoder.pkl")

        # --- Get weather data ---
        API_KEY = "c326b24e3c96469991759235b8d92af8"
        weather = get_weather_data(city, API_KEY)

        # Encode weather condition for model
        encoded_condition = le.transform([weather["Weather Condition"]])[0]

        # --- Prepare model input ---
        features = np.array([[
            weather["Temperature (°C)"],
            weather["Humidity (%)"],
            weather["Rainfall (mm)"],
            weather["Wind Speed (km/h)"],
            encoded_condition,
            50,   # Total_Orders placeholder
            45,   # Total_Received
            2,    # Total_Returned
            30000 # Revenue
        ]])

        # --- Make predictions ---
        predicted_surplus = round(float(surplus_model.predict(features)[0]), 2)
        predicted_deficit = round(float(deficit_model.predict(features)[0]), 2)

        # --- Save weather data into DB ---
        conn = get_db_connection()
        cursor = conn.cursor()

        insert_weather = """
            INSERT INTO weatherdata (`location`, `temperature`, `humidity`, `condition`)
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(insert_weather, (
            city,
            f"{weather['Temperature (°C)']} °C",
            f"{weather['Humidity (%)']}%",
            weather["Weather Condition"]
        ))
        conn.commit()

        weather_id = cursor.lastrowid  # Get inserted weather ID

        # --- Store forecast in ai_forecast ---
        # For simplicity, we'll assume productID = 1 and timeframe = "daily"
        insert_forecast = """
            INSERT INTO ai_forecast (productID, weatherID, predictedDemand, confidenceLvl, timeframe)
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(insert_forecast, (
            1,  # Replace with actual selected product ID later
            weather_id,
            predicted_surplus,  # Could store predicted demand (using surplus for now)
            95.00,  # Confidence level (placeholder)
            "daily"
        ))
        conn.commit()

        cursor.close()
        conn.close()

        # --- Return results to frontend ---
        return jsonify({
            "city": city,
            "temperature": weather["Temperature (°C)"],
            "humidity": weather["Humidity (%)"],
            "wind": weather["Wind Speed (km/h)"],
            "condition": weather["Weather Condition"],
            "predicted_surplus": predicted_surplus,
            "predicted_deficit": predicted_deficit,
            "message": "Forecast saved successfully!"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/generate_report", methods=["POST"])
@login_required
def generate_report():
    try:
        data = request.get_json()
        city = data.get("city", "Unknown")
        condition = data.get("condition", "N/A")
        temperature = data.get("temperature", "N/A")
        humidity = data.get("humidity", "N/A")
        wind = data.get("wind", "N/A")
        surplus = data.get("surplus", "N/A")
        deficit = data.get("deficit", "N/A")

        # --- Create PDF in memory ---
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []

        # --- Title ---
        story.append(Paragraph("<b>WeatherWise - AI Weather Report</b>", styles["Title"]))
        story.append(Spacer(1, 0.3 * inch))

        # --- Basic Info ---
        story.append(Paragraph(f"<b>City:</b> {city}", styles["Normal"]))
        story.append(Paragraph(f"<b>Weather Condition:</b> {condition}", styles["Normal"]))
        story.append(Paragraph(f"<b>Temperature:</b> {temperature}°C", styles["Normal"]))
        story.append(Paragraph(f"<b>Humidity:</b> {humidity}%", styles["Normal"]))
        story.append(Paragraph(f"<b>Wind Speed:</b> {wind} km/h", styles["Normal"]))
        story.append(Spacer(1, 0.2 * inch))

        # --- Prediction Table ---
        data_table = [
            ["Prediction Type", "Value", "Interpretation"],
            ["Predicted Surplus", surplus, "Estimated excess inventory."],
            ["Predicted Deficit", deficit, "Possible shortage risk."]
        ]

        table = Table(data_table, colWidths=[2.5*inch, 1.5*inch, 3*inch])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("BOX", (0, 0), (-1, -1), 1, colors.black),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey)
        ]))
        story.append(table)
        story.append(Spacer(1, 0.3 * inch))

        # --- Footer ---
        story.append(Paragraph("Generated by WeatherWise AI System", styles["Italic"]))
        story.append(Paragraph(f"Date: {datetime.now().strftime('%B %d, %Y, %I:%M %p')}", styles["Normal"]))

        doc.build(story)
        buffer.seek(0)

        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"{city}_WeatherWise_Report.pdf",
            mimetype="application/pdf"
        )

    except Exception as e:
        print("PDF Generation Error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/dashboard_stats")
@login_required
def api_dashboard_stats():
    # Use your helper to get a fresh connection
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # default response (safe fallback)
    response = {
        "revenue": 0,
        "ai_forecast_count": 0,
        "total_inventory_items": 0,
        "low_stock_count": 0,
        "profit_estimate": 0,
        "top_selling": [],
        "product_count": 0,
        "suppliers_categories": 0
    }

    try:
        # --- Sales Overview: revenue (sum of buyingPrice for delivered schedules) ---
        cursor.execute("SELECT IFNULL(SUM(buyingPrice), 0) AS total_revenue FROM scheduling WHERE schedStatus = 'Delivered'")
        row = cursor.fetchone()
        response["revenue"] = float(row["total_revenue"] or 0)

        # --- AI forecasts count ---
        cursor.execute("SELECT COUNT(*) AS cnt FROM ai_forecast")
        row = cursor.fetchone()
        response["ai_forecast_count"] = int(row["cnt"] or 0)

        # --- Inventory summary (sum of quantities) ---
        cursor.execute("SELECT IFNULL(SUM(quantity), 0) AS totalQty FROM inventory")
        row = cursor.fetchone()
        response["total_inventory_items"] = int(row["totalQty"] or 0)

        # --- Low stock count (quantity less than minThreshold) ---
        cursor.execute("SELECT COUNT(*) AS lowcount FROM inventory WHERE quantity < minThreshold")
        row = cursor.fetchone()
        response["low_stock_count"] = int(row["lowcount"] or 0)

        # --- Purchase / Profit estimate ---
        # current approximation: buyingPrice * orderQuantity for delivered schedules.
        cursor.execute("SELECT IFNULL(SUM(buyingPrice * orderQuantity), 0) AS profit_est FROM scheduling WHERE schedStatus = 'Delivered'")
        row = cursor.fetchone()
        response["profit_estimate"] = float(row["profit_est"] or 0)

        # --- Product count ---
        cursor.execute("SELECT COUNT(*) AS pcount FROM product")
        row = cursor.fetchone()
        response["product_count"] = int(row["pcount"] or 0)

        # --- Suppliers + distinct categories count (product table has category as varchar) ---
        cursor.execute("SELECT COUNT(DISTINCT supplierID) AS s_count, COUNT(DISTINCT category) AS c_count FROM product")
        row = cursor.fetchone()
        s_count = int(row["s_count"] or 0)
        c_count = int(row["c_count"] or 0)
        response["suppliers_categories"] = s_count + c_count

        # --- Top selling: best-effort using scheduling (delivered) grouped by productID → prodName ---
        cursor.execute("""
            SELECT p.prodName AS product, COALESCE(SUM(s.orderQuantity), 0) AS sold
            FROM scheduling s
            JOIN product p ON s.productID = p.productID
            WHERE s.schedStatus = 'Delivered'
            GROUP BY s.productID
            ORDER BY sold DESC
            LIMIT 6
        """)
        top_rows = cursor.fetchall()
        # each row is a dict because dictionary=True
        response["top_selling"] = [{"product": r["product"], "sold": int(r["sold"] or 0)} for r in top_rows]

    except Exception as e:
        # log the error to your console so you can inspect it
        print("api_dashboard_stats error:", repr(e))
        # keep response as-is (safe fallback)
    finally:
        cursor.close()
        conn.close()

    return jsonify(response)



# --- MAIN ---
if __name__ == "__main__":
    app.run(debug=True)