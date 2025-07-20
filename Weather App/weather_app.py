# Definindo o código HTML do Weather App
weather_app_code = """
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weather App</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background-color: #000;
            color: #fff;
        }

        .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: url('https://source.unsplash.com/1920x1080/?earth,space') no-repeat center center/cover;
        }

        .weather-info {
            background-color: rgba(0, 0, 0, 0.5);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            max-width: 400px;
            width: 100%;
        }

        .weather-info h1 {
            font-size: 3em;
            color: #FF0000; /* Vermelho */
        }

        .weather-info p {
            font-size: 1.5em;
            color: #fff;
        }

        .forecast {
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
        }

        .forecast div {
            text-align: center;
        }

        .forecast p {
            font-size: 1.2em;
            color: #fff;
        }

        button {
            padding: 10px 20px;
            margin-top: 20px;
            background-color: #FF0000;
            color: #fff;
            border: none;
            border-radius: 5px;
            font-size: 1em;
            cursor: pointer;
        }

        button:hover {
            background-color: #e60000;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="weather-info">
            <h1 id="city">São Paulo</h1>
            <p id="temp">--°C</p>
            <p id="weather">--</p>
            <button onclick="fetchWeather()">Obter Clima</button>
        </div>
        <div class="forecast">
            <div>
                <p>Próximas 24h</p>
                <p id="temp-forecast">--°C</p>
            </div>
            <div>
                <p>Vento</p>
                <p id="wind">-- km/h</p>
            </div>
            <div>
                <p>Umidade</p>
                <p id="humidity">--%</p>
            </div>
        </div>
    </div>

    <script>
        async function fetchWeather() {
            const city = "São Paulo";
            const apiKey = "791b1a2b41367ee5ea9ae2c464a80969";  // Substitua com sua chave de API do OpenWeatherMap ou similar
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=pt_br`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.cod === 200) {
                document.getElementById('temp').textContent = data.main.temp + '°C';
                document.getElementById('weather').textContent = data.weather[0].description;
                document.getElementById('wind').textContent = data.wind.speed + ' km/h';
                document.getElementById('humidity').textContent = data.main.humidity + '%';
                document.getElementById('temp-forecast').textContent = (data.main.temp + 5) + '°C';  // Exemplo simples de previsão
            } else {
                alert("Erro ao obter dados do clima.");
            }
        }

        fetchWeather();
    </script>
</body>
</html>
"""

# Caminho do arquivo para salvar
file_path = "weather_app.html"

# Abrindo o arquivo e escrevendo o conteúdo
with open(file_path, "w") as file:
    file.write(weather_app_code)

print(f"Arquivo {file_path} gerado com sucesso!")
