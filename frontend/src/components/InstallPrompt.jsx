import { useState, useEffect } from 'react';

export default function InstallPrompt() {
    const [installPromptEvent, setInstallPromptEvent] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSPrompt, setShowIOSPrompt] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Detect if already installed / running in standalone mode
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            setIsStandalone(true);
            return;
        }

        // --- Android / Chrome Installation ---
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setInstallPromptEvent(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // --- iOS / Safari Detection ---
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIPhoneOrIPad = /iphone|ipad|ipod/.test(userAgent);
        if (isIPhoneOrIPad) {
            setIsIOS(true);
            // Show iOS prompt if not standalone and haven't dismissed recently
            const hasDismissed = localStorage.getItem('ios_install_dismissed');
            if (!hasDismissed) {
                setShowIOSPrompt(true);
            }
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!installPromptEvent) return;

        installPromptEvent.prompt();
        const { outcome } = await installPromptEvent.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        setInstallPromptEvent(null);
    };

    const handleDismissIOS = () => {
        setShowIOSPrompt(false);
        localStorage.setItem('ios_install_dismissed', 'true');
    };

    if (isStandalone) return null; // Don't show anything if already installed

    return (
        <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
            {/* Install Button for Android/Desktop Chrome */}
            {installPromptEvent && (
                <div style={{
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>¡Instala Comparatico!</h4>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Para acceso rápido y experiencia de app nativa.
                        </p>
                    </div>
                    <button
                        onClick={handleInstallClick}
                        className="btn-primary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', width: 'auto' }}
                    >
                        Instalar
                    </button>
                </div>
            )}

            {/* Manual Instructions for iOS Safari */}
            {isIOS && showIOSPrompt && !installPromptEvent && (
                <div style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    padding: '1rem',
                    position: 'relative'
                }}>
                    <button
                        onClick={handleDismissIOS}
                        style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Instalar en iPhone 🍏</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        1. Toca el botón <b>Compartir</b> en la barra inferior.<br />
                        2. Desliza hacia abajo y selecciona <b>"Agregar a inicio"</b>.
                    </p>
                </div>
            )}
        </div>
    );
}
