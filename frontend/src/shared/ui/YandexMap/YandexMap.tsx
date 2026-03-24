import { useEffect, useRef, useState } from 'react';
import { loadYandexMaps } from '../../lib/loadYandexMaps';
import './YandexMap.css';

export interface SelectedOrganization {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  yandexUrl: string;
}

interface YandexMapProps {
  onOrganizationSelect: (org: SelectedOrganization) => void;
  height?: string;
}

export const YandexMap = ({ onOrganizationSelect, height }: YandexMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const clickMarkerRef = useRef<any>(null);
  const callbackRef = useRef(onOrganizationSelect);
  callbackRef.current = onOrganizationSelect;

  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SelectedOrganization[]>([]);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    loadYandexMaps()
      .then((ymaps) => {
        if (cancelled || !mapContainerRef.current) return;

        const map = new ymaps.Map(mapContainerRef.current, {
          center: [55.76, 37.64],
          zoom: 11,
          controls: ['zoomControl', 'geolocationControl'],
        });

        mapInstanceRef.current = map;

        // Suppress ALL native Yandex Maps UI
        map.options.set('suppressMapOpenBlock', true);
        map.options.set('openBalloonOnClick', false);

        const searchControl = new ymaps.control.SearchControl({
          options: {
            float: 'left',
            provider: 'yandex#search',
            size: 'large',
            placeholderContent: 'Поиск организации...',
            noSuggestPanel: false,
          },
        });
        map.controls.add(searchControl);

        // --- Helper: extract org data from a search result ---
        const extractOrgData = (
          result: any
        ): SelectedOrganization & { isOrg: boolean } => {
          const properties = result.properties.getAll();
          const coords = result.geometry.getCoordinates();
          const name = properties.name || properties.text || 'Без названия';
          const address = properties.description || properties.text || '';

          const companyMeta =
            properties.CompanyMetaData ||
            properties.companyMetaData ||
            (properties.metaDataProperty &&
              properties.metaDataProperty.CompanyMetaData);

          let yandexUrl = '';
          if (companyMeta && companyMeta.id) {
            const orgId = companyMeta.id;
            const slug = name
              .toLowerCase()
              .replace(/[^a-zа-яё0-9\s-]/gi, '')
              .replace(/\s+/g, '-')
              .substring(0, 60);
            yandexUrl = `https://yandex.ru/maps/org/${slug}/${orgId}/`;
          } else {
            yandexUrl = `https://yandex.ru/maps/?pt=${coords[1]},${coords[0]}&z=17&l=map`;
          }

          return {
            name,
            address,
            latitude: coords[0],
            longitude: coords[1],
            yandexUrl,
            isOrg: !!companyMeta,
          };
        };

        // --- Aggressively close any native balloon ---
        const closeBalloon = () => {
          try { map.balloon.close(); } catch {}
        };

        map.events.add('balloonopen', () => {
          setTimeout(closeBalloon, 0);
          setTimeout(closeBalloon, 100);
        });

        // --- Flag: skip map click when a search result was just selected ---
        let resultJustSelected = false;

        // --- When search results load → show in results list ---
        searchControl.events.add('load', () => {
          if (cancelled) return;
          try {
            const count = searchControl.getResultsCount();
            if (!count) {
              setSearchResults([]);
              return;
            }

            const promises: Promise<any>[] = [];
            for (let i = 0; i < Math.min(count, 10); i++) {
              promises.push(searchControl.getResult(i));
            }

            Promise.all(promises)
              .then((results) => {
                if (cancelled) return;
                const allResults = results.map(extractOrgData);
                const orgs = allResults.filter((r) => r.isOrg);
                setSearchResults(orgs.length > 0 ? orgs : allResults);
              })
              .catch(() => {
                if (!cancelled) setSearchResults([]);
              });
          } catch {
            setSearchResults([]);
          }
        });

        // --- Handle result click on map (resultselect + resultshow) ---
        const handleResultClick = () => {
          resultJustSelected = true;
          setTimeout(() => { resultJustSelected = false; }, 500);

          // Close native balloon immediately
          closeBalloon();
          setTimeout(closeBalloon, 50);
          setTimeout(closeBalloon, 200);

          const index = searchControl.getSelectedIndex();
          searchControl.getResult(index).then((result: any) => {
            if (!cancelled) {
              const { isOrg: _, ...org } = extractOrgData(result);
              callbackRef.current(org);
              closeBalloon();
            }
          });
        };

        searchControl.events.add('resultselect', handleResultClick);
        searchControl.events.add('resultshow', handleResultClick);

        // --- Click on map → reverse geocode → search for organizations ---
        const doSearch = (coords: number[]) => {
          closeBalloon();

          // Remove previous click marker
          if (clickMarkerRef.current) {
            map.geoObjects.remove(clickMarkerRef.current);
            clickMarkerRef.current = null;
          }

          // Place marker at clicked point
          const marker = new ymaps.Placemark(
            coords,
            {},
            { preset: 'islands#redCircleDotIcon' }
          );
          map.geoObjects.add(marker);
          clickMarkerRef.current = marker;

          // Reverse geocode → search for organizations at that address
          ymaps.geocode(coords, { results: 1 }).then((res: any) => {
            const firstObj = res.geoObjects.get(0);
            if (!firstObj) return;

            const address =
              (typeof firstObj.getAddressLine === 'function'
                ? firstObj.getAddressLine()
                : null) ||
              firstObj.properties.get('text') ||
              '';

            if (address) {
              searchControl.search(address);
            }
          });
        };

        // ymaps click event
        map.events.add('click', (e: any) => {
          if (resultJustSelected) return;
          doSearch(e.get('coords'));
        });

        // DOM-level click handler for native POI markers that ymaps misses
        let lastYmapsClickTime = 0;
        map.events.add('click', () => {
          lastYmapsClickTime = Date.now();
        });

        let mouseDownPos: [number, number] | null = null;
        const mapEl = mapContainerRef.current;

        const onMouseDown = (e: MouseEvent) => {
          mouseDownPos = [e.clientX, e.clientY];
        };

        const onDOMClick = (e: MouseEvent) => {
          if (resultJustSelected) return;
          if (Date.now() - lastYmapsClickTime < 300) return;

          if (mouseDownPos) {
            const dx = e.clientX - mouseDownPos[0];
            const dy = e.clientY - mouseDownPos[1];
            if (Math.sqrt(dx * dx + dy * dy) > 5) return;
          }

          const target = e.target as HTMLElement;
          if (
            target.closest('[class*="ymaps"][class*="control"]') ||
            target.closest('[class*="ymaps"][class*="search"]') ||
            target.closest('[class*="ymaps"][class*="suggest"]') ||
            target.closest('[class*="ymaps"][class*="balloon"]') ||
            target.closest('[class*="ymaps"][class*="zoom"]') ||
            target.closest('.yandex-map-results')
          ) {
            return;
          }

          try {
            const globalPixels = map.converter.pageToGlobal([e.pageX, e.pageY]);
            const geoCoords = ymaps.projection.wgs84Mercator.fromGlobalPixels(
              globalPixels,
              map.getZoom()
            );
            doSearch(geoCoords);
          } catch {
            try {
              const bounds = map.getBounds();
              const rect = mapEl.getBoundingClientRect();
              const xRatio = (e.clientX - rect.left) / rect.width;
              const yRatio = (e.clientY - rect.top) / rect.height;
              const lat = bounds[1][0] - yRatio * (bounds[1][0] - bounds[0][0]);
              const lng = bounds[0][1] + xRatio * (bounds[1][1] - bounds[0][1]);
              doSearch([lat, lng]);
            } catch { /* ignore */ }
          }
        };

        mapEl.addEventListener('mousedown', onMouseDown);
        mapEl.addEventListener('click', onDOMClick);

        // Geolocation
        ymaps.geolocation
          .get({ provider: 'browser' })
          .then((result: any) => {
            const userCoords = result.geoObjects.get(0).geometry.getCoordinates();
            map.setCenter(userCoords, 12);
          })
          .catch(() => {});

        setMapLoading(false);

        const cleanup = () => {
          mapEl.removeEventListener('mousedown', onMouseDown);
          mapEl.removeEventListener('click', onDOMClick);
        };
        (map as any).__domCleanup = cleanup;
      })
      .catch((err) => {
        if (!cancelled) {
          setMapError(err.message || 'Ошибка загрузки карты');
          setMapLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as any).__domCleanup?.();
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Auto-scroll to results list when it appears
  useEffect(() => {
    if (searchResults.length > 0 && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [searchResults]);

  const handleSelectOrg = (org: SelectedOrganization) => {
    callbackRef.current(org);
  };

  return (
    <div className="yandex-map-wrapper">
      {mapLoading && (
        <div className="yandex-map-loading">
          <p>Загрузка карты...</p>
        </div>
      )}
      {mapError && (
        <div className="yandex-map-error">
          <p>{mapError}</p>
        </div>
      )}
      <div
        ref={mapContainerRef}
        className="yandex-map-container"
        style={{
          height: height || '400px',
          visibility: mapLoading ? 'hidden' : 'visible',
          position: mapLoading ? 'absolute' : 'relative',
        }}
      />

      {searchResults.length > 0 && (
        <div className="yandex-map-results" ref={resultsRef}>
          <p className="yandex-map-results-title">
            Организации ({searchResults.length})
          </p>
          {searchResults.map((org, i) => (
            <div
              key={`${org.latitude}-${org.longitude}-${i}`}
              className="yandex-map-result-item"
              onClick={() => handleSelectOrg(org)}
            >
              <div className="yandex-map-result-info">
                <span className="yandex-map-result-name">{org.name}</span>
                {org.address && (
                  <span className="yandex-map-result-address">
                    {org.address}
                  </span>
                )}
              </div>
              <button
                className="yandex-map-result-add"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectOrg(org);
                }}
                title="Выбрать организацию"
              >
                +
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
