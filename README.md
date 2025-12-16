🧩 Running WeatherWise Locally

Prerequisites

MySQL Workbench must be running and the weatherwise database must already exist.

Python 3.10+ must be installed on your system.

⚙️ Steps to Run the Project

Open VS Code and press Ctrl + Shift + P, then search for
“Python: Select Interpreter” → choose the Python executable inside your project’s virtual environment folder

WeatherWise\venv\Scripts\python.exe


Open a new terminal in VS Code and navigate to the web folder:

cd ITS120L-WEB


Allow PowerShell scripts to run for this session:

Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process


Recreate your virtual environment:

Remove-Item -Recurse -Force venv -ErrorAction SilentlyContinue
python -m venv venv


Activate the virtual environment:

.\venv\Scripts\Activate.ps1


Install all dependencies:

pip install Flask mysql-connector-python flask-login flask-mail authlib pytz flask-cors python-dotenv requests joblib numpy reportlab sklearn

Set Flask environment variables and run the app:

$env:FLASK_APP = "app.py"
$env:FLASK_DEBUG = "1"
flask run


Open your browser and go to:

http://127.0.0.1:5000/