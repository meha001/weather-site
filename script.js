document.addEventListener('DOMContentLoaded', function() {
    const apiKey = '397b836bdf403becc540ac7abec1bab5';
    const searchBtn = document.getElementById('search-btn');
    const cityInput = document.getElementById('city-input');
    const metricBtn = document.getElementById('metric-btn');
    const imperialBtn = document.getElementById('imperial-btn');
    const forecastContainer = document.getElementById('forecast');
    const detailedDay = document.getElementById('detailed-day');
    const backBtn = document.getElementById('back-to-forecast');
    let currentUnit = 'metric';
    let hourlyChart;
    let currentCity = 'Москва';
    let currentDataCache = null;
    
    init();
    
    function init() {
        updateCurrentDate();
        initChart();
        getWeatherData(currentCity);
        setupEventListeners();
    }
    
    function setupEventListeners() {
        searchBtn.addEventListener('click', handleSearch);
        cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
        
        metricBtn.addEventListener('click', () => switchUnits('metric'));
        imperialBtn.addEventListener('click', () => switchUnits('imperial'));
        backBtn.addEventListener('click', () => {
            forecastContainer.style.display = 'grid';
            detailedDay.style.display = 'none';
        });
    }
    
    function handleSearch() {
        const city = cityInput.value.trim();
        if (city) {
            currentCity = city;
            getWeatherData(city);
        } else {
            alert('Пожалуйста, введите название города');
        }
    }
    
    function switchUnits(unit) {
        if (currentUnit !== unit) {
            currentUnit = unit;
            metricBtn.classList.toggle('active', unit === 'metric');
            imperialBtn.classList.toggle('active', unit === 'imperial');
            
            // Перезагружаем данные с новыми единицами измерения
            getWeatherData(currentCity);
        }
    }
    
    async function getWeatherData(city) {
        try {
            document.getElementById('city-name').textContent = 'Загрузка...';
            document.getElementById('current-temp').textContent = '--';
            document.getElementById('weather-description').textContent = 'Получение данных...';
            
            // Текущая погода
            const currentResponse = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&lang=ru&units=${currentUnit}`
            );
            
            if (!currentResponse.ok) {
                const errorData = await currentResponse.json();
                throw new Error(errorData.message || 'Город не найден');
            }
            
            const currentData = await currentResponse.json();
            
            // Прогноз
            const forecastResponse = await fetch(
                `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&lang=ru&units=${currentUnit}`
            );
            
            if (!forecastResponse.ok) {
                throw new Error('Ошибка при получении прогноза');
            }
            
            const forecastData = await forecastResponse.json();
            
            // Кэшируем данные
            currentDataCache = {
                current: currentData,
                forecast: forecastData,
                unit: currentUnit
            };
            
            updateCurrentWeather(currentData);
            updateForecast(forecastData);
            updateHourlyChart(forecastData);
            
        } catch (error) {
            console.error('Ошибка:', error);
            alert(`Ошибка: ${error.message}`);
            document.getElementById('city-name').textContent = 'Ошибка загрузки';
        }
    }
    
    function updateCurrentDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
        };
        document.getElementById('current-date').textContent = now.toLocaleDateString('ru-RU', options);
    }
    
    function initChart() {
        const ctx = document.getElementById('hourly-chart').getContext('2d');
        hourlyChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.parsed.y}°${currentUnit === 'metric' ? 'C' : 'F'}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: (value) => `${value}°${currentUnit === 'metric' ? 'C' : 'F'}`
                        }
                    }
                }
            }
        });
    }
    
    function updateCurrentWeather(data) {
        document.getElementById('city-name').textContent = `${data.name}, ${data.sys.country}`;
        document.getElementById('current-temp').textContent = Math.round(data.main.temp);
        document.getElementById('weather-description').textContent = 
            `Ощущается как ${Math.round(data.main.feels_like)}°${currentUnit === 'metric' ? 'C' : 'F'}. ${data.weather[0].description}.`;
        
        document.getElementById('wind-speed').textContent = Math.round(data.wind.speed);
        document.getElementById('pressure').textContent = data.main.pressure;
        document.getElementById('humidity').textContent = data.main.humidity;
        updateUnitsDisplay();
    }
    
    function updateUnitsDisplay() {
        document.querySelectorAll('.temp-unit').forEach(el => {
            el.textContent = `°${currentUnit === 'metric' ? 'C' : 'F'}`;
        });
        
        document.querySelectorAll('.wind-unit').forEach(el => {
            el.textContent = currentUnit === 'metric' ? 'м/с' : 'миль/ч';
        });
    }
    
    function updateForecast(data) {
        forecastContainer.innerHTML = '';
        
        const dailyForecast = {};
        data.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dateKey = date.toLocaleDateString('ru-RU');
            
            if (!dailyForecast[dateKey]) {
                dailyForecast[dateKey] = {
                    date: date,
                    temps: [],
                    feels: [],
                    weather: [],
                    wind: [],
                    pressures: [],
                    humidities: [],
                    timeData: {
                        morning: null,
                        day: null,
                        evening: null,
                        night: null
                    }
                };
            }
            const hours = date.getHours();
            if (hours >= 6 && hours < 12 && !dailyForecast[dateKey].timeData.morning) {
                dailyForecast[dateKey].timeData.morning = item;
            } else if (hours >= 12 && hours < 18 && !dailyForecast[dateKey].timeData.day) {
                dailyForecast[dateKey].timeData.day = item;
            } else if (hours >= 18 && hours < 24 && !dailyForecast[dateKey].timeData.evening) {
                dailyForecast[dateKey].timeData.evening = item;
            } else if (hours >= 0 && hours < 6 && !dailyForecast[dateKey].timeData.night) {
                dailyForecast[dateKey].timeData.night = item;
            }
            
            dailyForecast[dateKey].temps.push(item.main.temp);
            dailyForecast[dateKey].feels.push(item.main.feels_like);
            dailyForecast[dateKey].weather.push(item.weather[0]);
            dailyForecast[dateKey].wind.push(item.wind.speed);
            dailyForecast[dateKey].pressures.push(item.main.pressure);
            dailyForecast[dateKey].humidities.push(item.main.humidity);
        });
        
        const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        const forecastDates = Object.keys(dailyForecast).slice(0, 7);
        
        forecastDates.forEach(dateKey => {
            const dayData = dailyForecast[dateKey];
            const date = dayData.date;
            const dayName = daysOfWeek[date.getDay()];
            const dayNumber = date.getDate();
            const month = date.toLocaleString('ru-RU', { month: 'short' });
            
            const maxTemp = Math.round(Math.max(...dayData.temps));
            const minTemp = Math.round(Math.min(...dayData.temps));
            const avgFeels = Math.round(dayData.feels.reduce((a, b) => a + b, 0) / dayData.feels.length);
            const avgPressure = Math.round(dayData.pressures.reduce((a, b) => a + b, 0) / dayData.pressures.length);
            const avgHumidity = Math.round(dayData.humidities.reduce((a, b) => a + b, 0) / dayData.humidities.length);
            
            const dayElement = document.createElement('div');
            dayElement.className = 'forecast-day';
            dayElement.innerHTML = `
                <div class="forecast-date">${dayName}, ${dayNumber} ${month}</div>
                <div class="forecast-temp">${maxTemp} / ${minTemp}°${currentUnit === 'metric' ? 'C' : 'F'}</div>
                <div class="forecast-feels">Ощущается: ${avgFeels}°${currentUnit === 'metric' ? 'C' : 'F'}</div>
                <div class="forecast-details">
                    <span><i class="fas fa-tachometer-alt"></i> ${avgPressure} гПа</span>
                    <span><i class="fas fa-tint"></i> ${avgHumidity}%</span>
                </div>
            `;
            
            dayElement.addEventListener('click', () => {
                showDetailedDay(dayData, `${dayName}, ${dayNumber} ${month}`);
                document.querySelectorAll('.forecast-day').forEach(el => el.classList.remove('active'));
                dayElement.classList.add('active');
            });
            
            forecastContainer.appendChild(dayElement);
        });
    }
    
    function updateHourlyChart(data) {
        const now = new Date();
        const hourlyData = data.list.filter(item => {
            const itemDate = new Date(item.dt * 1000);
            return itemDate >= now && itemDate <= new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }).slice(0, 24);
        
        const labels = hourlyData.map(item => {
            const date = new Date(item.dt * 1000);
            return `${date.getHours()}:00`;
        });
        
        const temps = hourlyData.map(item => Math.round(item.main.temp));
        
        hourlyChart.data.labels = labels;
        hourlyChart.data.datasets = [{
            label: 'Температура',
            data: temps,
            borderColor: 'rgba(255, 152, 0, 1)',
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            tension: 0.4,
            fill: true
        }];
        
        hourlyChart.options.scales.y.ticks.callback = (value) => `${value}°${currentUnit === 'metric' ? 'C' : 'F'}`;
        hourlyChart.update();
    }
    
    function showDetailedDay(dayData, dateString) {
        forecastContainer.style.display = 'none';
        detailedDay.style.display = 'block';
        
        document.getElementById('detailed-day-title').textContent = dateString;
        
        const maxTemp = Math.round(Math.max(...dayData.temps));
        const minTemp = Math.round(Math.min(...dayData.temps));
        const avgWeather = dayData.weather[0];
        const avgWind = (dayData.wind.reduce((a, b) => a + b, 0) / dayData.wind.length);
        const avgPressure = Math.round(dayData.pressures.reduce((a, b) => a + b, 0) / dayData.pressures.length);
        const avgHumidity = Math.round(dayData.humidities.reduce((a, b) => a + b, 0) / dayData.humidities.length);
        
        document.getElementById('detailed-high').textContent = maxTemp;
        document.getElementById('detailed-low').textContent = minTemp;
        document.getElementById('detailed-description').textContent = 
            `${avgWeather.description}. Ветер ${Math.round(avgWind)} ${currentUnit === 'metric' ? 'м/с' : 'миль/ч'}.`;
        
        document.getElementById('detailed-wind').textContent = Math.round(avgWind);
        document.getElementById('detailed-pressure').textContent = avgPressure;
        document.getElementById('detailed-humidity').textContent = avgHumidity;

        const timeData = dayData.timeData;
        const getTemp = (time) => time ? Math.round(time.main.temp) : '--';
        const getFeels = (time) => time ? Math.round(time.main.feels_like) : '--';
        
        document.getElementById('morning-temp').textContent = getTemp(timeData.morning);
        document.getElementById('day-temp').textContent = getTemp(timeData.day);
        document.getElementById('evening-temp').textContent = getTemp(timeData.evening);
        document.getElementById('night-temp').textContent = getTemp(timeData.night);
        
        document.getElementById('morning-feels').textContent = getFeels(timeData.morning);
        document.getElementById('day-feels').textContent = getFeels(timeData.day);
        document.getElementById('evening-feels').textContent = getFeels(timeData.evening);
        document.getElementById('night-feels').textContent = getFeels(timeData.night);

        document.querySelectorAll('#detailed-day .temp-unit').forEach(el => {
            el.textContent = `°${currentUnit === 'metric' ? 'C' : 'F'}`;
        });
    }
});