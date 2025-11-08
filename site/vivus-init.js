// Vivus.js CDN
// <script src="https://cdn.jsdelivr.net/npm/vivus@latest/dist/vivus.min.js"></script>
// Usage example:
// new Vivus('my-svg', { type: 'delayed', duration: 200 });

// This script initializes Vivus for an SVG with id 'signature-svg'.
document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('message-svg')) {
    new Vivus('message-svg', {
      type: 'delayed',
      duration: 200,
      animTimingFunction: Vivus.EASE
    });
  }
});
