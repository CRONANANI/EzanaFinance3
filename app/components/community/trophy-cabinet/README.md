# Trophy Cabinet Component

A modular component for displaying user achievements and badges in the Ezana Finance community page.

## Files

- `trophy-cabinet.html` - HTML structure for the trophy cabinet overlay
- `trophy-cabinet.css` - Styling for the trophy cabinet component
- `trophy-cabinet.js` - JavaScript functionality and data management
- `README.md` - This documentation file

## Features

- **Modular Design**: Separate HTML, CSS, and JS files for easy maintenance
- **Dynamic Loading**: Component loads dynamically into the community page
- **Interactive Trophies**: Click on trophies to view details or requirements
- **Responsive Design**: Works on desktop and mobile devices
- **Animated Reveals**: Trophies animate in when the cabinet opens
- **Achievement Categories**: Organized into logical groups (Investment, Community, Knowledge, Special)
- **Rarity System**: Different trophy rarities with visual indicators
- **Locked/Unlocked States**: Clear distinction between earned and unearned trophies

## Usage

### Basic Integration

1. Include the CSS file in your HTML head:
```html
<link rel="stylesheet" href="../components/community/trophy-cabinet/trophy-cabinet.css">
```

2. Include the JavaScript file before closing body tag:
```html
<script src="../components/community/trophy-cabinet/trophy-cabinet.js"></script>
```

3. Add a container div where the component will be loaded:
```html
<div id="trophy-cabinet-container"></div>
```

4. Load the component dynamically:
```javascript
async function loadTrophyCabinet() {
    try {
        const response = await fetch('../components/community/trophy-cabinet/trophy-cabinet.html');
        const html = await response.text();
        document.getElementById('trophy-cabinet-container').innerHTML = html;
    } catch (error) {
        console.error('Failed to load trophy cabinet component:', error);
    }
}
```

### Opening the Trophy Cabinet

```javascript
// Show the trophy cabinet
showTrophyCabinet();

// Hide the trophy cabinet
closeTrophyCabinet();
```

### Adding New Trophies

```javascript
// Add a new trophy when user earns it
window.trophyCabinet.addTrophy('investment-mastery', 'new-trophy-id');
```

### Updating User Stats

```javascript
// Update user statistics
window.trophyCabinet.updateUserStats({
    trophiesEarned: 15,
    badgesUnlocked: 10,
    globalRank: 100
});
```

## Trophy Data Structure

Trophies are organized into categories with the following structure:

```javascript
{
    categories: [
        {
            id: 'category-id',
            name: 'Category Name',
            icon: 'bi-icon-class',
            color1: '#hex-color',
            color2: '#hex-color',
            trophies: [
                {
                    id: 'trophy-id',
                    name: 'Trophy Name',
                    description: 'Trophy description',
                    icon: 'bi-trophy-fill',
                    earned: true,
                    earnedDate: '2024-01-15',
                    rarity: 'common' // common, uncommon, rare, epic, legendary
                }
            ]
        }
    ]
}
```

## Rarity Levels

- **Common** (Gray): Basic achievements
- **Uncommon** (Green): Moderate achievements
- **Rare** (Blue): Difficult achievements
- **Epic** (Purple): Very difficult achievements
- **Legendary** (Gold): Extremely difficult achievements

## Styling Customization

The component uses CSS custom properties for easy theming:

```css
.trophy-item.your-trophy {
    --trophy-color-1: #your-color-1;
    --trophy-color-2: #your-color-2;
}
```

## Browser Support

- Modern browsers with ES6+ support
- CSS Grid and Flexbox support required
- Bootstrap Icons for iconography

## Dependencies

- Bootstrap Icons (for trophy and category icons)
- Modern CSS features (Grid, Flexbox, Custom Properties)
- ES6+ JavaScript features

## API Integration

To integrate with a real API, modify the `loadTrophyData()` method in `trophy-cabinet.js`:

```javascript
async loadTrophyData() {
    try {
        const response = await fetch('/api/user/trophies');
        this.trophyData = await response.json();
    } catch (error) {
        console.error('Failed to load trophy data:', error);
        this.trophyData = this.getMockTrophyData();
    }
}
```
