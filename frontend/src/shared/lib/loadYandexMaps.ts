let ymapsPromise: Promise<any> | null = null;

export function loadYandexMaps(): Promise<any> {
  if (ymapsPromise) return ymapsPromise;

  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error('VITE_YANDEX_MAPS_API_KEY не задан в .env'));
  }

  ymapsPromise = new Promise((resolve, reject) => {
    if (window.ymaps) {
      window.ymaps.ready(() => resolve(window.ymaps));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;

    script.onload = () => {
      window.ymaps.ready(() => resolve(window.ymaps));
    };

    script.onerror = () => {
      ymapsPromise = null;
      reject(new Error('Не удалось загрузить Яндекс.Карты'));
    };

    document.head.appendChild(script);
  });

  return ymapsPromise;
}
