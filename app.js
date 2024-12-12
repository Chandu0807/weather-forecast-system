// Configuration and API Setup
const API_KEY ='744307820caff6b4402fdd7dec1dc49a';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Extended DOM Element Selectors
const elements = {
    citySearch: document.getElementById('citySearch'),
    searchButton: document.getElementById('searchButton'),
    currentLocationBtn: document.getElementById('currentLocationBtn'),
    currentWeather: document.getElementById('currentWeather'),
    extendedForecast: document.getElementById('extendedForecast'),
    errorMessage: document.getElementById('errorMessage'),
    recentSearches: document.getElementById('recentSearches'),
    unitToggle: document.getElementById('unitToggle'),
    dataViewToggle: document.getElementById('dataViewToggle'),
    refreshButton: document.getElementById('refreshButton'),
    savedLocationsContainer: document.getElementById('savedLocations')
};


// Utility Functions
const kelvinToCelsius = (kelvin) => Math.round(kelvin - 273.15);
const getWeatherIcon = (iconCode) => `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

// Local Storage Management for Recent Searches
const recentSearchesManager = {
    key: 'weatherRecentSearches',
    get() {
        return JSON.parse(localStorage.getItem(this.key) || '[]');
    },
    add(city) {
        const searches = this.get();
        if (!searches.includes(city)) {
            searches.unshift(city);
            if (searches.length > 5) searches.pop();
            localStorage.setItem(this.key, JSON.stringify(searches));
        }
        this.updateDropdown();
    },
    updateDropdown() {
        const searches = this.get();
        const dropdown = elements.recentSearches;
        
        dropdown.innerHTML = '<option value="">Recent Searches</option>';
        searches.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            dropdown.appendChild(option);
        });
        
        dropdown.classList.toggle('hidden', searches.length === 0);
    }
};

// Error Handling
function displayError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
    elements.currentWeather.classList.add('hidden');
    elements.extendedForecast.classList.add('hidden');
}

// Fetch Current Weather
async function fetchCurrentWeather(query) {
    try {
        const response = await fetch(`${BASE_URL}/weather?q=${query}&appid=${API_KEY}&units=metric`);
        if (!response.ok) throw new Error('City not found');
        
        const data = await response.json();
        updateCurrentWeatherUI(data);
        return data;
    } catch (error) {
        displayError(error.message);
    }
}

// Update Current Weather UI
function updateCurrentWeatherUI(data) {
    elements.currentWeather.classList.remove('hidden');
    elements.errorMessage.classList.add('hidden');
    document.getElementById('locationName').textContent = data.name;
    document.getElementById('temperature').textContent = `${Math.round(data.main.temp)} ${unitConverter.getTemperatureSymbol()}`;
    document.getElementById('weatherDescription').textContent = data.weather[0].description;
    document.getElementById('weatherIcon').src = getWeatherIcon(data.weather[0].icon);
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('windSpeed').textContent = `${data.wind.speed} m/s`;
    document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;

    // Add to recent searches
    recentSearchesManager.add(data.name);
}

// Fetch Extended Forecast using async/await
async function fetchExtendedForecast(query) {
    try {
        const response = await fetch(`${BASE_URL}/forecast?q=${query}&appid=${API_KEY}&units=metric`);
        if (!response.ok) throw new Error('Extended forecast not available');
        
        const data = await response.json();
        updateExtendedForecastUI(data);
    } catch (error) {
        displayError(error.message);
    }
}

// Update Extended Forecast UI
function updateExtendedForecastUI(data) {
    elements.extendedForecast.classList.remove('hidden');
    elements.extendedForecast.innerHTML = '';

    // Group forecast by day (OpenWeatherMap provides 3-hour intervals)
    const dailyForecasts = {};
    data.list.forEach(forecast => {
        const date = forecast.dt_txt.split(' ')[0];
        if (!dailyForecasts[date]) {
            dailyForecasts[date] = forecast;
        }
    });

    Object.values(dailyForecasts).slice(0, 5).forEach(forecast => {
        const forecastEl = document.createElement('div');
        forecastEl.classList.add('bg-white', 'rounded-lg', 'p-4', 'text-center', 'shadow-md');
        
        forecastEl.innerHTML = `
            <p class="font-semibold">${new Date(forecast.dt_txt).toLocaleDateString('en-US', { weekday: 'short' })}</p>
            <img src="${getWeatherIcon(forecast.weather[0].icon)}" alt="Weather" class="mx-auto w-16 h-16">
            <p>${Math.round(forecast.main.temp)}°C</p>
            <p class="text-sm text-gray-600">Wind speed: ${forecast.wind.speed} m/s</p>
            <p class="text-sm text-gray-600">Humidity: ${forecast.main.humidity}%</p>
        `;

        elements.extendedForecast.appendChild(forecastEl);
    });
}

// Get Current Location
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const response = await fetch(`${BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${unitConverter.currentUnit}`);
                    const data = await response.json();
                    updateCurrentWeatherUI(data);
                    elements.citySearch.value = data.name;
                    fetchExtendedForecast(data.name);
                    lastFetchedWeatherData = data;
                    weatherDataView.renderView(data);
                } catch (error) {
                    displayError('Unable to fetch location weather');
                }
            },
            () => displayError('Location access denied')
        );
    } else {
        displayError('Geolocation not supported');
    }
}

// Event Listeners
elements.searchButton.addEventListener('click', () => {
    const city = elements.citySearch.value.trim();
    if (!city) {
        alert('Please enter a city name.');
        return;
    }
    else {
        fetchCurrentWeather(city);
        fetchExtendedForecast(city);
    }
});

elements.citySearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = elements.citySearch.value.trim();
        if (!city) {
            alert('Please enter a city name.');
            return;
        }
        else {
            fetchCurrentWeather(city);
            fetchExtendedForecast(city);
        }
    }
});

elements.currentLocationBtn.addEventListener('click', getCurrentLocation);

elements.recentSearches.addEventListener('change', (e) => {
    const selectedCity = e.target.value;
    if (selectedCity) {
        fetchCurrentWeather(selectedCity);
        fetchExtendedForecast(selectedCity);
        elements.citySearch.value = selectedCity;
    }
});

// Initialize page
recentSearchesManager.updateDropdown();


const unitConverter = {
    currentUnit: 'metric',
    toggleUnit() {
        this.currentUnit = this.currentUnit === 'metric' ? 'imperial' : 'metric';
        return this.currentUnit;
    },
    convertTemperature(temp, fromUnit = 'metric') {
        if (fromUnit === 'metric') {
            return this.currentUnit === 'imperial' 
                ? Math.round(temp * 9/5 + 32)  // Celsius to Fahrenheit
                : Math.round(temp);
        } else {
            return this.currentUnit === 'metric'
                ? Math.round((temp - 32) * 5/9)  // Fahrenheit to Celsius
                : Math.round(temp);
        }
    },
    getTemperatureSymbol() {
        return this.currentUnit === 'metric' ? '°C' : '°F';
    }
};

// Enhanced Recent and Saved Locations Management
const locationManager = {
    savedLocationsKey: 'weatherSavedLocations',
    
    getSavedLocations() {
        return JSON.parse(localStorage.getItem(this.savedLocationsKey) || '[]');
    },
    
    addSavedLocation(city) {
        const savedLocations = this.getSavedLocations();
        if (!savedLocations.includes(city)) {
            savedLocations.push(city);
            localStorage.setItem(this.savedLocationsKey, JSON.stringify(savedLocations));
            this.renderSavedLocations();
        }
    },
    
    removeSavedLocation(city) {
        const savedLocations = this.getSavedLocations().filter(loc => loc !== city);
        localStorage.setItem(this.savedLocationsKey, JSON.stringify(savedLocations));
        this.renderSavedLocations();
    },
    
    renderSavedLocations() {
        const savedLocations = this.getSavedLocations();
        const container = elements.savedLocationsContainer;
        
        container.innerHTML = '';
        savedLocations.forEach(city => {
            const locationEl = document.createElement('div');
            locationEl.classList.add('saved-location');
            locationEl.innerHTML = `
                ${city}
                <button class="remove-location" data-city="${city}">×</button>
            `;
            container.appendChild(locationEl);
        });
        
        // Add event listeners to remove buttons
        container.querySelectorAll('.remove-location').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cityToRemove = e.target.dataset.city;
                this.removeSavedLocation(cityToRemove);
            });
        });
    }
};

// Enhanced Weather Data View
const weatherDataView = {
    currentView: 'detailed',
    views: ['detailed', 'wind', 'humidity'],
    
    toggleView() {
        const currentIndex = this.views.indexOf(this.currentView);
        this.currentView = this.views[(currentIndex + 1) % this.views.length];
        return this.currentView;
    },
    
    renderView(weatherData) {
        const viewContainer = document.getElementById('weatherDataView');
        viewContainer.innerHTML = '';
        
        switch(this.currentView) {
            case 'detailed':
                viewContainer.innerHTML = `
                    <p>Feels Like: ${unitConverter.convertTemperature(weatherData.main.feels_like)}${unitConverter.getTemperatureSymbol()}</p>
                    <p>Min Temp: ${unitConverter.convertTemperature(weatherData.main.temp_min)}${unitConverter.getTemperatureSymbol()}</p>
                    <p>Max Temp: ${unitConverter.convertTemperature(weatherData.main.temp_max)}${unitConverter.getTemperatureSymbol()}</p>
                `;
                break;
            case 'wind':
                viewContainer.innerHTML = `
                    <p>Wind Speed: ${weatherData.wind.speed} ${unitConverter.currentUnit === 'metric' ? 'm/s' : 'mph'}</p>
                    <p>Wind Direction: ${weatherData.wind.deg}°</p>
                `;
                break;
            case 'humidity':
                viewContainer.innerHTML = `
                    <p>Humidity: ${weatherData.main.humidity}%</p>
                    <p>Pressure: ${weatherData.main.pressure} hPa</p>
                `;
                break;
        }
    }
};


elements.unitToggle.addEventListener('click', () => {
    const newUnit = unitConverter.toggleUnit();
    this.fetchCurrentWeather(elements.citySearch.value || 'hyderabad');
    this.fetchExtendedForecast(elements.citySearch.value || 'hyderabad');
    elements.unitToggle.textContent = `Switch to ${newUnit === 'metric' ? 'Imperial' : 'Metric'}`;
});

elements.dataViewToggle.addEventListener('click', () => {
    const newView = weatherDataView.toggleView();
    if (lastFetchedWeatherData) {
        weatherDataView.renderView(lastFetchedWeatherData);
    }
    elements.dataViewToggle.textContent = `View: ${newView.charAt(0).toUpperCase() + newView.slice(1)}`;
});

elements.refreshButton.addEventListener('click', () => {
    const currentCity = elements.citySearch.value || 'London';
    fetchCurrentWeather(currentCity);
    fetchExtendedForecast(currentCity);
});

let lastFetchedWeatherData = null;
async function fetchCurrentWeather(query) {
    try {
        const response = await fetch(`${BASE_URL}/weather?q=${query}&appid=${API_KEY}&units=${unitConverter.currentUnit}`);
        if (!response.ok) throw new Error('City not found');    
        const data = await response.json();
        lastFetchedWeatherData = data;
        updateCurrentWeatherUI(data);
        weatherDataView.renderView(data);
        return data;
    } catch (error) {
        displayError(error.message);
    }
}

function addCurrentLocationToSaved() {
    const currentCity = elements.citySearch.value;
    if (currentCity) {
        locationManager.addSavedLocation(currentCity);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    recentSearchesManager.updateDropdown();
    locationManager.renderSavedLocations();
    fetchCurrentWeather('hyderabad');
});