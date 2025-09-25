# Sign Up Card Component

This directory contains the modular sign-up card component for user registration functionality.

## Components

### sign-up-card/
- **sign-up-card.html** - HTML structure for the sign-up card
- **sign-up-card.css** - Styling for the sign-up card component
- **sign-up-card.js** - JavaScript functionality for form validation and submission

## Features

- **Form Validation** - Real-time full name, email, password, and confirm password validation
- **Social Sign Up** - Google and Facebook sign-up buttons
- **Terms Agreement** - Required checkbox for terms and conditions
- **Newsletter Opt-in** - Optional email updates subscription
- **Responsive Design** - Mobile-friendly layout with glassmorphism effects
- **Error Handling** - Clear error messages and visual feedback
- **Success Messages** - Animated success notifications
- **Modern UI** - Glassmorphism design with gradient accents

## Usage

The sign-up card component can be loaded dynamically into any page that needs user registration functionality.

## Dependencies

- Bootstrap Icons for social media icons
- Custom CSS for glassmorphism effects
- JavaScript for form validation and submission handling

## Integration

This component is designed to work with the main sign-up page (`app/pages/sign-up.html`) and can be easily integrated into other pages that require user registration.

## Form Fields

- Full Name (required)
- Email (required, validated)
- Password (required, strength validation)
- Confirm Password (required, must match)
- Terms Agreement (required checkbox)
- Newsletter Subscription (optional checkbox)

## Social Integration

- Google OAuth sign-up (placeholder implementation)
- Facebook OAuth sign-up (placeholder implementation)
