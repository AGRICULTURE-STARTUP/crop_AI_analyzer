import os
import requests
import json

def get_weather_data(location: str):
    """
    Fetches real-time weather data for a given location using OpenWeather API.
    Returns Temperature, Rainfall, Humidity, and Wind.
    """
    api_key = os.getenv('OPEN_WEATHER_API_KEY')
    if not api_key:
        return json.dumps({"error": "OPEN_WEATHER_API_KEY environment variable not set."})

    try:
        url = f"http://api.openweathermap.org/data/2.5/weather?q={location}&appid={api_key}&units=metric"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        # Extracting required fields
        temp = data.get('main', {}).get('temp', 'N/A')
        humidity = data.get('main', {}).get('humidity', 'N/A')
        wind_speed = data.get('wind', {}).get('speed', 'N/A')
        
        # Rainfall in the last 1 hour (if available)
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
