import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AppleBehavior } from './components/AppleBehavior.jsx';
import './styles.css';
import './apple-behavior.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><AppleBehavior /><App /></React.StrictMode>);
