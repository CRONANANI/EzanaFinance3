// Component Loader Utility
class ComponentLoader {
    constructor() {
        this.loadedComponents = new Set();
        this.loadingPromises = new Map();
    }

    async loadComponent(componentPath, containerId) {
        const componentKey = `${componentPath}-${containerId}`;
        
        // Return existing promise if already loading
        if (this.loadingPromises.has(componentKey)) {
            return this.loadingPromises.get(componentKey);
        }

        // Return immediately if already loaded
        if (this.loadedComponents.has(componentKey)) {
            return Promise.resolve();
        }

        const loadPromise = this._loadComponentFiles(componentPath, containerId);
        this.loadingPromises.set(componentKey, loadPromise);

        try {
            await loadPromise;
            this.loadedComponents.add(componentKey);
            this.loadingPromises.delete(componentKey);
        } catch (error) {
            this.loadingPromises.delete(componentKey);
            throw error;
        }
    }

    async _loadComponentFiles(componentPath, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with id '${containerId}' not found`);
        }

        try {
            // Load HTML
            const htmlResponse = await fetch(`${componentPath}.html`);
            if (!htmlResponse.ok) {
                throw new Error(`Failed to load HTML for ${componentPath}`);
            }
            const htmlContent = await htmlResponse.text();
            container.innerHTML = htmlContent;

            // Load CSS
            const cssPath = `${componentPath}.css`;
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = cssPath;
            cssLink.id = `css-${componentPath.replace(/\//g, '-')}`;
            
            // Check if CSS is already loaded
            if (!document.getElementById(cssLink.id)) {
                document.head.appendChild(cssLink);
            }

            // Load JS
            const jsPath = `${componentPath}.js`;
            const jsScript = document.createElement('script');
            jsScript.src = jsPath;
            jsScript.id = `js-${componentPath.replace(/\//g, '-')}`;
            
            // Check if JS is already loaded
            if (!document.getElementById(jsScript.id)) {
                document.head.appendChild(jsScript);
            }

            return new Promise((resolve, reject) => {
                jsScript.onload = resolve;
                jsScript.onerror = reject;
            });

        } catch (error) {
            console.error(`Error loading component ${componentPath}:`, error);
            throw error;
        }
    }

    async loadMultipleComponents(components) {
        const loadPromises = components.map(({ path, containerId }) => 
            this.loadComponent(path, containerId)
        );
        
        try {
            await Promise.all(loadPromises);
        } catch (error) {
            console.error('Error loading multiple components:', error);
            throw error;
        }
    }

    isComponentLoaded(componentPath, containerId) {
        const componentKey = `${componentPath}-${containerId}`;
        return this.loadedComponents.has(componentKey);
    }

    unloadComponent(componentPath, containerId) {
        const componentKey = `${componentPath}-${containerId}`;
        this.loadedComponents.delete(componentKey);
        
        // Remove CSS
        const cssId = `css-${componentPath.replace(/\//g, '-')}`;
        const cssLink = document.getElementById(cssId);
        if (cssLink) {
            cssLink.remove();
        }
        
        // Remove JS
        const jsId = `js-${componentPath.replace(/\//g, '-')}`;
        const jsScript = document.getElementById(jsId);
        if (jsScript) {
            jsScript.remove();
        }
        
        // Clear container
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
        }
    }
}

// Global instance
window.componentLoader = new ComponentLoader();

// Helper function for easy use
window.loadComponent = (componentPath, containerId) => {
    return window.componentLoader.loadComponent(componentPath, containerId);
};

// Helper function for loading multiple components
window.loadComponents = (components) => {
    return window.componentLoader.loadMultipleComponents(components);
};
