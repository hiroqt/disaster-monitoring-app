# Disaster Monitoring System

> PH Based Disaster Monitoring App

A real-time disaster monitoring and alerting system for Trece Martires City, Cavite, Philippines. This application aggregates data from multiple sources (USGS earthquakes, GDACS disasters, weather alerts) to provide comprehensive hazard tracking and visualization.

## Features

- **Real-time Hazard Monitoring**: Track earthquakes, tropical cyclones, floods, and other disasters
- **Interactive Map**: Visualize hazards on an interactive map with custom layers
- **Multi-source Data**: Integrates USGS, GDACS, and weather API data
- **Offline Support**: Progressive Web App (PWA) capabilities for offline access
- **Mobile-First Design**: Responsive design optimized for mobile devices
- **Incident Reporting**: Allow users to report local incidents
- **Customizable Alerts**: Configure notification preferences

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: React Leaflet for maps, CSS Modules for styling
- **State Management**: Zustand
- **Backend**: Node.js + Express
- **APIs**: USGS Earthquake API, GDACS, OpenWeatherMap

## Project Structure

```
disaster-monitoring/
├── disaster-monitoring-app/
│   ├── src/                    # Frontend React application
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API service layer
│   │   ├── store/              # Zustand state management
│   │   └── types/              # TypeScript type definitions
│   ├── server/                 # Backend Express server
│   │   └── services/           # External API integrations
│   └── public/                 # Static assets
└── md/                         # Project documentation
    ├── requirements.md         # Feature requirements
    ├── design.md               # System design
    ├── tasks.md                # Implementation tasks
    └── security-scalability.md # Security & scaling considerations
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- OpenWeatherMap API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/hiroqt/disaster-monitoring-app.git
   cd disaster-monitoring
   ```

2. Install dependencies:
   ```bash
   cd disaster-monitoring-app
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENWEATHER_API_KEY
   ```

4. Start the development server:
   ```bash
   # Terminal 1 - Start backend
   npm run server

   # Terminal 2 - Start frontend
   npm run dev
   ```

5. Open your browser to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run server` - Start Express backend server

## API Integration

The system integrates with:

- **USGS Earthquake API**: Real-time earthquake data (no key required)
- **GDACS**: Global disaster alerts (no key required)
- **OpenWeatherMap**: Weather data and alerts (API key required)

## Contributing

Contributions are welcome! Please read the documentation in the `md/` folder for project requirements and design guidelines.

## License

[Add your license here]

## Contact

[Add contact information]
