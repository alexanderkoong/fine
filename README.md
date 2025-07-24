# Team Fine System

A simple client-side web application for tracking fines in a sports team.

## Features

- **Login System**: Username-based authentication with role detection
- **Role-based Access**: 
  - Upper class users (admins) can add new fines
  - Viewers can only see existing fines
- **Fine Tracking**: View all fines with details (date, offender, description, amount, proposer)
- **Data Persistence**: All data stored in browser localStorage

## Users

### Admin Users (can add fines):
- alexkoong
- zanderbravo
- noahhernandez
- jameslian

### Viewer Users:
- Anyone else can log in as a viewer to see fines

## Deployment

This is a static website that can be hosted on GitHub Pages:

1. Push all files to a GitHub repository
2. Enable GitHub Pages in repository settings
3. Select source as main branch
4. Access the site at `https://[username].github.io/[repository-name]`

## Files

- `index.html` - Main HTML structure
- `style.css` - Styling and responsive design
- `script.js` - JavaScript functionality
- `README.md` - This documentation

## Usage

1. Open the website
2. Enter your username to log in
3. If you're an admin, you can add new fines using the form
4. All users can view the fines table
5. Data persists between browser sessions