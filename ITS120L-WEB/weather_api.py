# weather_api.py
import requests

def get_weather_data(city_name, api_key):
    url = f"http://api.openweathermap.org/data/2.5/weather?q={city_name}&appid={api_key}&units=metric"
    response = requests.get(url)
    data = response.json()

    if response.status_code != 200:
        raise Exception(data.get("message", "Error fetching weather data"))

    weather = {
        "Temperature (°C)": data["main"]["temp"],
        "Humidity (%)": data["main"]["humidity"],
        "Rainfall (mm)": data.get("rain", {}).get("1h", 0),
        "Wind Speed (km/h)": data["wind"]["speed"],
        "Weather Condition": data["weather"][0]["main"]
    }
    return weather
