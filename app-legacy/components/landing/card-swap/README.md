# CardSwap Component

A vanilla JavaScript implementation of an animated card swapping component, converted from React to work with the Ezana Finance landing page.

## Features

- **3D Card Animation**: Cards stack and swap with smooth 3D transformations
- **Auto-rotation**: Cards automatically cycle through with configurable timing
- **Hover Pause**: Animation pauses on hover (optional)
- **Click Handling**: Individual cards can be clicked for interactions
- **Responsive**: Scales appropriately on mobile devices
- **GSAP Integration**: Uses GSAP for smooth, performant animations

## Files

- `card-swap.html` - HTML structure with 5 sample cards
- `card-swap.css` - Styling for cards and animations
- `card-swap.js` - Vanilla JavaScript implementation
- `README.md` - This documentation

## Usage

### Basic Implementation

```javascript
// Initialize CardSwap
const cardSwap = createCardSwap('#card-swap-container', {
  width: 500,
  height: 400,
  cardDistance: 60,
  verticalDistance: 70,
  delay: 5000,
  pauseOnHover: true,
  onCardClick: (index) => {
    console.log('Card clicked:', index);
  }
});
```

### Configuration Options

- `width` (number|string): Width of each card (default: 500)
- `height` (number|string): Height of each card (default: 400)
- `cardDistance` (number): Horizontal distance between cards (default: 60)
- `verticalDistance` (number): Vertical offset between cards (default: 70)
- `delay` (number): Time between swaps in milliseconds (default: 5000)
- `pauseOnHover` (boolean): Pause animation on hover (default: false)
- `onCardClick` (function): Callback when a card is clicked
- `skewAmount` (number): Skew angle for 3D effect (default: 6)
- `easing` (string): Animation easing type - 'elastic' or 'linear' (default: 'elastic')

### Methods

- `pause()`: Pause the animation
- `resume()`: Resume the animation
- `destroy()`: Clean up the component

## Card Content

The component includes 5 sample cards:

1. **Portfolio Overview** - Total value and daily change
2. **Market Performance** - S&P 500 vs portfolio performance
3. **Top Holdings** - Best performing stocks
4. **Risk Analysis** - Risk score and diversification
5. **Dividend Income** - Monthly dividends and next payout

## Styling

Cards feature:
- Glassmorphism design with backdrop blur
- Color-coded left borders
- Hover effects with green glow
- Responsive scaling on mobile
- 3D transform effects

## Dependencies

- GSAP (GreenSock Animation Platform)
- Bootstrap Icons for card icons

## Browser Support

- Modern browsers with CSS3 3D transforms support
- ES6+ JavaScript features
- CSS backdrop-filter support (for glassmorphism effect)
