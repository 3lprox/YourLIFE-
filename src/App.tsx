import React, { useState, useEffect, useCallback } from 'react';

// --- CONFIGURACIÓN ---
// 1. Reemplaza esto con tu Client ID de la app de Spotify Developer Dashboard.
// Fix: Added explicit string type to prevent TypeScript from inferring a literal type, which caused a comparison error.
const CLIENT_ID: string = '6c0ff52f8ca34ab2b8c3c28e0c77e566'; 
// 2. Asegúrate de que esta URL esté en la lista de Redirect URIs en tu app de Spotify.
const REDIRECT_URI = window.location.origin;
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const RESPONSE_TYPE = 'token';
const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ');

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [track, setTrack] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = () => {
    setError(null); // Limpiar errores previos al intentar iniciar sesión de nuevo
    const authUrl = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&response_type=${RESPONSE_TYPE}&show_dialog=true`;
    window.location.href = authUrl;
  };

  const handleLogout = () => {
    setToken(null);
    setTrack(null);
    window.localStorage.removeItem('spotify_token');
  };

  const getCurrentlyPlaying = useCallback(async (currentToken: string) => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (response.status === 401) {
        setError("Error de autenticación. Tu sesión puede haber expirado o la URL de la aplicación no está autorizada.");
        handleLogout();
        return;
      }

      if (response.status === 204 || response.status > 400) {
        setTrack(null);
        return;
      }
      
      const data = await response.json();
      setTrack(data);
      setError(null); // Limpiar el error si la llamada es exitosa
    } catch (error) {
      console.error("Error fetching currently playing track:", error);
      setError("No se pudo conectar con Spotify. Revisa tu conexión a internet.");
    }
  }, []);
  
  const playbackControl = async (endpoint: string) => {
      if (!token) return;
      try {
        const response = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            }
        });
        if (response.status === 401) {
            setError("Error de autenticación. Tu sesión puede haber expirado.");
            handleLogout();
            return;
        }
        // Espera un momento para que la API de Spotify se actualice, luego refresca el estado
        setTimeout(() => getCurrentlyPlaying(token), 500);
      } catch (e) {
          console.error("Error with playback control:", e);
          setError("Error al controlar la reproducción.");
      }
  }

  useEffect(() => {
    const hash = window.location.hash;
    let storedToken = window.localStorage.getItem('spotify_token');

    if (!storedToken && hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      if (accessToken) {
        storedToken = accessToken;
        window.localStorage.setItem('spotify_token', storedToken);
        window.location.hash = '';
      }
    }
    setToken(storedToken);
  }, []);
  
  useEffect(() => {
      if (token) {
          getCurrentlyPlaying(token);
          const intervalId = setInterval(() => getCurrentlyPlaying(token), 5000); // Poll every 5 seconds
          return () => clearInterval(intervalId);
      }
  }, [token, getCurrentlyPlaying]);

  if (!token) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-lg">
          <svg role="img" height="64" width="64" aria-hidden="true" viewBox="0 0 16 16" className="mx-auto mb-6"><path fill="#1DB954" d="M8 1.5a6.5 6.5 0 100 13a6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z"></path><path fill="#1DB954" d="M5.222 10.345a.75.75 0 011.06 0c.91.91 2.39.91 3.3 0a.75.75 0 111.06-1.06c-1.434-1.435-3.728-1.435-5.162 0a.75.75 0 010 1.06z"></path></svg>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">YourLIFE!</h1>
          <p className="text-lg text-gray-400 mb-8">
            Conecta tu vida. Controla tu música.
          </p>
           {error && (
             <div className="bg-red-900/50 border border-red-400 text-red-300 px-4 py-3 rounded-lg relative mb-6 text-left" role="alert">
                <strong className="font-bold">¡Ocurrió un error!</strong>
                <span className="block sm:inline"> {error}</span>
                <p className="text-sm mt-2 text-red-200">
                    <strong>Sugerencia:</strong> Asegúrate que la URL actual (`{window.location.origin}`) está añadida a tus 'Redirect URIs' en el <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-white">Dashboard de Spotify</a>.
                </p>
            </div>
          )}
          <button onClick={handleLogin} className="bg-[#1DB954] text-white font-bold py-3 px-8 rounded-full text-lg uppercase tracking-wider hover:bg-[#1ED760] transition-transform hover:scale-105">
            Iniciar sesión con Spotify
          </button>
        </div>
      </div>
    );
  }
  
  return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex flex-col items-center justify-center p-4 transition-all duration-500">
        <div className="absolute top-4 right-4">
            <button onClick={handleLogout} className="bg-white/10 text-white font-semibold py-2 px-4 rounded-full text-sm hover:bg-white/20 transition">
                Cerrar Sesión
            </button>
        </div>
        <div className="w-full max-w-sm text-center">
            <div className="relative shadow-2xl shadow-green-900/20 rounded-lg overflow-hidden group">
                {track?.item?.album.images[0]?.url ? (
                    <img src={track.item.album.images[0].url} alt={track.item.name} className="w-full h-auto aspect-square object-cover" />
                ) : (
                    <div className="w-full aspect-square bg-gray-800 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-12c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>
                    </div>
                )}
            </div>
            
            <div className="mt-6">
                {track?.item ? (
                    <>
                        <h2 className="text-2xl font-bold truncate" title={track.item.name}>{track.item.name}</h2>
                        <p className="text-gray-400 text-lg truncate" title={track.item.artists.map((a: any) => a.name).join(', ')}>
                            {track.item.artists.map((a: any) => a.name).join(', ')}
                        </p>
                    </>
                ) : (
                    <h2 className="text-2xl font-bold text-gray-500">No hay música sonando</h2>
                )}
            </div>

            <div className="mt-8 flex items-center justify-center space-x-6">
                <button onClick={() => playbackControl('previous')} className="text-gray-400 hover:text-white transition-colors" aria-label="Previous track">
                    <svg role="img" height="24" width="24" aria-hidden="true" viewBox="0 0 16 16"><path fill="currentColor" d="M3.3 1a.7.7 0 01.7.7v5.15l9.95-5.744a.7.7 0 011.05.606v12.575a.7.7 0 01-1.05.607L4 8.15V13.3a.7.7 0 01-1.4 0V1.7a.7.7 0 01.7-.7z"></path></svg>
                </button>
                <button onClick={() => playbackControl(track?.is_playing ? 'pause' : 'play')} className="bg-white text-black rounded-full p-4 hover:scale-110 transition-transform shadow-lg shadow-white/20" aria-label={track?.is_playing ? 'Pause' : 'Play'}>
                    {track?.is_playing ? (
                        <svg role="img" height="24" width="24" aria-hidden="true" viewBox="0 0 16 16"><path fill="currentColor" d="M2.7 1a.7.7 0 00-.7.7v12.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7H2.7zm8 0a.7.7 0 00-.7.7v12.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7h-2.6z"></path></svg>
                    ) : (
                        <svg role="img" height="24" width="24" aria-hidden="true" viewBox="0 0 16 16"><path fill="currentColor" d="M3 1.713a.7.7 0 011.05-.607l10.89 6.288a.7.7 0 010 1.212L4.05 14.894A.7.7 0 013 14.288V1.713z"></path></svg>
                    )}
                </button>
                <button onClick={() => playbackControl('next')} className="text-gray-400 hover:text-white transition-colors" aria-label="Next track">
                    <svg role="img" height="24" width="24" aria-hidden="true" viewBox="0 0 16 16"><path fill="currentColor" d="M12.7 1a.7.7 0 00-.7.7v5.15L2.05 1.107A.7.7 0 001 1.712v12.575a.7.7 0 001.05.607L12 8.15V13.3a.7.7 0 001.4 0V1.7a.7.7 0 00-.7-.7z"></path></svg>
                </button>
            </div>
        </div>
      </div>
  );
};

export default App;
