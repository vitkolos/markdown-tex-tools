// https://gui-challenges.web.app/theme-switch/dist/
{
    const storageKey = 'theme-preference';

    const flipValue = (value) => (value === 'light') ? 'dark' : 'light';

    const onClick = (event) => {
        // flip current value
        theme.value = flipValue(theme.value);
        setPreference();
        event.preventDefault();
        return false;
    };

    const getColorPreference = () => {
        if (localStorage.getItem(storageKey)) {
            return localStorage.getItem(storageKey);
        } else {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
    };

    const setPreference = () => {
        localStorage.setItem(storageKey, theme.value);
        reflectPreference();
    };

    const reflectPreference = () => {
        document.firstElementChild.setAttribute('data-theme', theme.value);

        if (document.getElementById('theme-toggle')) {
            document.getElementById('theme-toggle').textContent = flipValue(theme.value);
        }
    };

    const theme = {
        value: getColorPreference()
    };

    // set early so no page flashes / CSS is made aware
    reflectPreference();

    window.onload = () => {
        // set on load so screen readers can see latest value on the button
        reflectPreference();

        // now this script can find and listen for clicks on the control
        document.getElementById('theme-toggle')?.addEventListener('click', onClick);
    };

    // sync with system changes
    window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', ({ matches: isDark }) => {
            theme.value = isDark ? 'dark' : 'light';
            setPreference();
        });
}
