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

        // Extract organisation data from a ymaps search result
        const extractOrgData = (
          result: any,
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

        // Suppress native Yandex balloons
        const closeBalloon = () => {
          try { map.balloon.close(); } catch { /* noop */ }
        };
        map.events.add('balloonopen', () => {
          setTimeout(closeBalloon, 0);
          setTimeout(closeBalloon, 100);
        });

        // When the search control loads results → populate the panel
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
                const all = results.map(extractOrgData);
                const orgs = all.filter((r) => r.isOrg);
                setSearchResults(orgs.length > 0 ? orgs : all);
              })
              .catch(() => { if (!cancelled) setSearchResults([]); });
          } catch {
            setSearchResults([]);
          }
        });

        // When user clicks a search result on the map or in the list
        const handleResultClick = () => {
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

        // Centre on the user's geolocation
        ymaps.geolocation
          .get({ provider: 'browser' })
          .then((result: any) => {
            if (cancelled) return;
            const coords = result.geoObjects.get(0)?.geometry.getCoordinates();
            if (coords) map.setCenter(coords, 12);
          })
          .catch(() => {});

        setMapLoading(false);
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
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Scroll the results panel into view when it appears
  useEffect(() => {
    if (searchResults.length > 0 && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [searchResults]);

  const handleSelectOrg = (org: SelectedOrganization) => {
    callbackRef.current(org);
  };

  const handleCloseSheet = () => {
    setSearchResults([]);
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
          <div className="yandex-map-results-header">
            <div className="yandex-map-results-header-info">
              <span className="yandex-map-results-title">
                Результаты поиска ({searchResults.length})
              </span>
            </div>
            <button
              className="yandex-map-results-close"
              onClick={handleCloseSheet}
              title="Закрыть"
            >
              ✕
            </button>
          </div>
          <div className="yandex-map-results-list">
            {searchResults.map((org, i) => (
              <div
                key={`${org.latitude}-${org.longitude}-${i}`}
                className="yandex-map-result-item"
                onClick={() => handleSelectOrg(org)}
              >
                <div className="yandex-map-result-info">
                  <span className="yandex-map-result-name">{org.name}</span>
                  {org.address && (
                    <span className="yandex-map-result-address">{org.address}</span>
                  )}
                </div>
                <button
                  className="yandex-map-result-add"
                  onClick={(e) => { e.stopPropagation(); handleSelectOrg(org); }}
                  title="Добавить филиал"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
