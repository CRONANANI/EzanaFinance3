# Registration Components

This directory contains all the components for the user registration page.

## Components Structure

```
create-account/
├── registration-form/
│   ├── registration-form.html
│   ├── registration-form.css
│   └── registration-form.js
├── benefits-section/
│   ├── benefits-section.html
│   ├── benefits-section.css
│   └── benefits-section.js
├── registration-page/
│   ├── registration-page.html
│   ├── registration-page.css
│   └── registration-page.js
└── README.md
```

## Component Descriptions

### Registration Form (`registration-form/`)
- **HTML**: Complete form structure with all input fields
- **CSS**: Styling for form elements, validation states, and responsive design
- **JS**: Form validation, submission handling, and real-time feedback

### Benefits Section (`benefits-section/`)
- **HTML**: Benefits showcase with icons and descriptions
- **CSS**: Card-based layout with hover effects
- **JS**: Scroll animations and intersection observer

### Registration Page (`registration-page/`)
- **HTML**: Main container that loads other components
- **CSS**: Grid layout and responsive design
- **JS**: Component loader and page-level functionality

## Usage

### Individual Components
Each component can be used independently by including its HTML, CSS, and JS files.

### Complete Page
Use the `registration-page` component to load all registration components together.

## Features

- **Form Validation**: Real-time validation with error messages
- **Responsive Design**: Mobile-first approach with tablet and desktop support
- **Modern UI**: Glass-morphism effects and smooth animations
- **Accessibility**: Proper labels, ARIA attributes, and keyboard navigation
- **Security**: Password strength validation and secure form handling

## Dependencies

- Bootstrap Icons
- Google Fonts (Lato)
- Modern CSS features (backdrop-filter, grid, flexbox)

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
