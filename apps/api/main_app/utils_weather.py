import os
import requests
import json

def get_weather_by_coords(lat, lon):
    api_key = os.getenv('OPEN_WEATHER_API_KEY')
    if not api_key:
        return json.dumps({"error": "OPEN_WEATHER_API_KEY environment variable not set."})

    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
        response = requests.get(url, timeout=8)
        response.raise_for_status()
        data = response.json()
        result = {
            "location": data.get("name") or f"{lat},{lon}",
            "temperature_celsius": data.get("main", {}).get("temp", "N/A"),
            "humidity_percent": data.get("main", {}).get("humidity", "N/A"),
            "wind_speed_m_s": data.get("wind", {}).get("speed", "N/A"),
            "rainfall_1h_mm": data.get("rain", {}).get("1h", 0),
        }
        return json.dumps(result)
    except requests.exceptions.RequestException as e:
        return json.dumps({"error": f"Failed to fetch weather data: {str(e)}"})
    except Exception as e:
        return json.dumps({"error": f"An unexpected error occurred: {str(e)}"})


def get_weather_data(location: str):
    api_key = os.getenv('OPEN_WEATHER_API_KEY')
    if not api_key:
        return json.dumps({"error": "OPEN_WEATHER_API_KEY environment variable not set."})

    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?q={location}&appid={api_key}&units=metric"
        response = requests.get(url, timeout=8)
        response.raise_for_status()
        data = response.json()

     
        temp = data.get('main', {}).get('temp', 'N/A')
        humidity = data.get('main', {}).get('humidity', 'N/A')
        wind_speed = data.get('wind', {}).get('speed', 'N/A')
        
        
        rain_1h = data.get('rain', {}).get('1h', 0)

        result = {
            "location": location,
            "temperature_celsius": temp,
            "humidity_percent": humidity,
            "wind_speed_m_s": wind_speed,
            "rainfall_1h_mm": rain_1h
        }
        
        return json.dumps(result)

    except requests.exceptions.RequestException as e:
        return json.dumps({"error": f"Failed to fetch weather data: {str(e)}"})
    except Exception as e:
        return json.dumps({"error": f"An unexpected error occurred: {str(e)}"})
