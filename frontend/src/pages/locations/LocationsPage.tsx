import { useState, useEffect, useRef } from 'react';
import { Card, Button } from '../../shared/ui';
import { PlusIcon, MapPinIcon, TrashIcon, SearchIcon } from '../../shared/ui';
import { YandexMap, type SelectedOrganization } from '../../shared/ui';
import { locationApi } from '../../shared/api/locationApi';
import type { Location } from '../../shared/types';
import './LocationsPage.css';

export const LocationsPage = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<SelectedOrganization | null>(null);
  const [addingFromMap, setAddingFromMap] = useState(false);
  const selectedOrgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  // Auto-scroll to selected org panel when it appears
  useEffect(() => {
    if (selectedOrg && selectedOrgRef.current) {
      selectedOrgRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedOrg]);

  const loadLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await locationApi.getLocations();
      const safeData = Array.isArray(data) ? data : [];
      setLocations(safeData);
    } catch (err) {
      setError('Ошибка загрузки филиалов');
      console.error('Failed to load locations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!window.confirm('Удалить филиал?')) {
      return;
    }

    try {
      setDeletingId(id);
      await locationApi.deleteLocation(id);
      setLocations(locations.filter(l => l.id !== id));
    } catch (err: any) {
      alert('Ошибка при удалении: ' + (err.message || 'Неизвестная ошибка'));
      console.error('Failed to delete location:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleOrganizationSelect = (org: SelectedOrganization) => {
    setSelectedOrg(org);
  };

  const handleAddFromMap = async () => {
    if (!selectedOrg) return;

    try {
      setAddingFromMap(true);
      await locationApi.createLocation({
        name: selectedOrg.name,
        address: selectedOrg.address || undefined,
        latitude: selectedOrg.latitude,
        longitude: selectedOrg.longitude,
        yandexUrl: selectedOrg.yandexUrl || undefined,
      });
      setSelectedOrg(null);
      loadLocations();
    } catch (err: any) {
      alert('Ошибка добавления: ' + (err.message || 'Неизвестная ошибка'));
    } finally {
      setAddingFromMap(false);
    }
  };

  if (loading) {
    return (
      <div className="locations-page">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p>Загрузка филиалов...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="locations-page">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ color: '#ef4444' }}>{error}</p>
          <Button onClick={loadLocations} style={{ marginTop: '20px' }}>Попробовать снова</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="locations-page">
      <div className="locations-header">
        <div>
          <h1 className="locations-title">Филиалы</h1>
          <p className="locations-subtitle">Организации для анализа отзывов</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={<PlusIcon size={16} />}
          onClick={() => setShowAddModal(true)}
        >
          Вручную
        </Button>
      </div>

      <Card padding="lg" className="map-section">
        <div className="map-section-header">
          <SearchIcon size={20} />
          <span>Найдите организацию на карте</span>
        </div>
        <YandexMap onOrganizationSelect={handleOrganizationSelect} height="400px" />
      </Card>

      {selectedOrg && (
        <div ref={selectedOrgRef}>
          <Card padding="lg" className="selected-org-card">
            <div className="selected-org-info">
              <div className="selected-org-icon">
                <MapPinIcon size={24} />
              </div>
              <div className="selected-org-details">
                <h3 className="selected-org-name">{selectedOrg.name}</h3>
                {selectedOrg.address && (
                  <p className="selected-org-address">{selectedOrg.address}</p>
                )}
              </div>
            </div>
            <div className="selected-org-actions">
              <Button
                variant="primary"
                onClick={handleAddFromMap}
                disabled={addingFromMap}
                icon={<PlusIcon size={18} />}
              >
                {addingFromMap ? 'Добавление...' : 'Добавить филиал'}
              </Button>
              <Button variant="outline" onClick={() => setSelectedOrg(null)}>
                Отменить
              </Button>
            </div>
          </Card>
        </div>
      )}

      <h2 className="locations-section-title">
        Мои филиалы {locations.length > 0 && `(${locations.length})`}
      </h2>

      {locations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ fontSize: '18px', color: '#666', marginBottom: '20px' }}>
            У вас пока нет сохранённых филиалов
          </p>
          <p style={{ fontSize: '14px', color: '#999' }}>
            Найдите организацию на карте выше или добавьте вручную
          </p>
        </div>
      ) : (
        <div className="locations-list">
          {locations.map((loc) => (
            <Card key={loc.id} hoverable padding="none">
              <div className="location-card">
                <div className="location-icon">
                  <MapPinIcon size={24} />
                </div>
                <div className="location-info">
                  <h3 className="location-name">{loc.name}</h3>
                  {loc.address && <p className="location-address">{loc.address}</p>}
                  <div className="location-platforms">
                    {loc.yandexUrl && (
                      <a href={loc.yandexUrl} target="_blank" rel="noopener noreferrer" className="location-badge platform-badge--yandex">
                        Яндекс ↗
                      </a>
                    )}
                    {loc.twogisUrl ? (
                      <a href={loc.twogisUrl} target="_blank" rel="noopener noreferrer" className="location-badge platform-badge--2gis">
                        2ГИС ↗
                      </a>
                    ) : (
                      <a
                        href={`https://2gis.ru/search/${encodeURIComponent(loc.name + (loc.address ? ', ' + loc.address : ''))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="location-badge platform-badge--2gis-search"
                      >
                        Найти на 2ГИС →
                      </a>
                    )}
                  </div>
                </div>
                <div className="location-actions">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<TrashIcon size={16} />}
                    onClick={(e) => handleDelete(loc.id, e)}
                    disabled={deletingId === loc.id}
                    style={{ color: '#ef4444', borderColor: '#ef4444' }}
                  >
                    {deletingId === loc.id ? 'Удаление...' : 'Удалить'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddLocationModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadLocations();
          }}
        />
      )}
    </div>
  );
};

// --- Helper: resolve org name + address from a Yandex Maps URL ---
// Primary strategy: extract org ID from URL and use ymaps.findOrganization(id)
// which returns a GeoObject with accurate name, address, and CompanyMetaData.
// Fallback: search by slug name via ymaps.search.Provider.
const resolveYandexUrl = async (
  url: string
): Promise<{ name: string; address: string } | null> => {
  const ymaps = window.ymaps;
  if (!ymaps) return null;

  // Decode URL to handle %2C etc.
  let decodedUrl = url;
  try { decodedUrl = decodeURIComponent(url); } catch {}

  // Extract org slug and numeric ID from /org/{slug}/{id}/
  const orgPathMatch = decodedUrl.match(/\/org\/([^/]+)\/(\d+)/);
  const slug = orgPathMatch ? orgPathMatch[1] : '';
  const orgId = orgPathMatch ? orgPathMatch[2] : null;
  const slugName = slug.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

  // Helper: extract org info from a GeoObject
  const extractFromGeoObject = (obj: any): { name: string; address: string } | null => {
    const props = obj.properties.getAll();
    const meta =
      props.CompanyMetaData ||
      props.companyMetaData ||
      (props.metaDataProperty && props.metaDataProperty.CompanyMetaData);
    const name = (meta && meta.name) || props.name || '';
    const address =
      (meta && meta.address) ||
      props.description ||
      (typeof obj.getAddressLine === 'function' ? obj.getAddressLine() : '') ||
      '';
    return name ? { name, address } : null;
  };

  // Strategy 1: ymaps.findOrganization(orgId) — direct lookup by ID.
  // Returns a GeoObject with exact org name, address, and metadata.
  if (orgId && typeof ymaps.findOrganization === 'function') {
    try {
      const orgGeoObject: any = await new Promise((resolve, reject) => {
        ymaps.findOrganization(orgId).then(resolve, reject);
      });
      const result = extractFromGeoObject(orgGeoObject);
      if (result) return result;
    } catch {
      // Organization not found or API error, continue to fallbacks
    }
  }

  // Strategy 2: Search by slug name via ymaps.search.Provider (business search).
  // Yandex search handles Latin transliteration of Russian names well.
  if (slugName) {
    // Build bounding box around ll= coordinates if available
    const llMatch =
      decodedUrl.match(/[?&]ll=([0-9.]+),([0-9.]+)/) ||
      decodedUrl.match(/[?&]pt=([0-9.]+),([0-9.]+)/);
    let searchBounds: number[][] | undefined;
    if (llMatch) {
      const lng = parseFloat(llMatch[1]);
      const lat = parseFloat(llMatch[2]);
      searchBounds = [[lat - 1, lng - 1], [lat + 1, lng + 1]];
    }

    try {
      const provider = new (ymaps as any).search.Provider('yandex#search');
      const options: any = { results: 10 };
      if (searchBounds) {
        options.boundedBy = searchBounds;
        options.strictBounds = false;
      }

      const res: any = await new Promise((resolve, reject) => {
        provider.geocode(slugName, options).then(resolve, reject);
      });

      const count = res.geoObjects.getLength();

      // First pass: match by org ID
      if (orgId) {
        for (let i = 0; i < count; i++) {
          const obj = res.geoObjects.get(i);
          const props = obj.properties.getAll();
          const meta =
            props.CompanyMetaData ||
            props.companyMetaData ||
            (props.metaDataProperty && props.metaDataProperty.CompanyMetaData);
          if (meta && String(meta.id) === orgId) {
            return extractFromGeoObject(obj);
          }
        }
      }

      // Second pass: use first result
      if (count > 0) {
        const result = extractFromGeoObject(res.geoObjects.get(0));
        if (result) return result;
      }
    } catch {
      // search.Provider not available, continue
    }
  }

  // Final fallback: just the slug as name, no address
  if (slugName) {
    return { name: slugName, address: '' };
  }

  return null;
};

const AddLocationModal = ({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [name, setName] = useState('');
  const [resolvedName, setResolvedName] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [yandexUrl, setYandexUrl] = useState('');
  const [twogisUrl, setTwogisUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve org info from a Yandex Maps URL
  const resolveUrl = async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      setResolvedName('');
      setResolvedAddress('');
      return;
    }

    setResolving(true);
    try {
      const result = await resolveYandexUrl(trimmed);
      if (result) {
        setResolvedName(result.name);
        setResolvedAddress(result.address);
        // Auto-fill name if user hasn't typed one
        if (!name.trim() && result.name) {
          setName(result.name);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setResolving(false);
    }
  };

  // Trigger on blur (manual typing)
  const handleYandexUrlBlur = () => {
    resolveUrl(yandexUrl);
  };

  // Trigger immediately on paste
  const handleYandexUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    // The state hasn't updated yet from paste, so use the pasted value directly
    setYandexUrl(pasted);
    resolveUrl(pasted);
  };

  const handleSubmit = async () => {
    const finalName = name.trim() || resolvedName;
    if (!finalName) {
      setError('Укажите название или вставьте URL на Яндекс.Картах');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await locationApi.createLocation({
        name: finalName,
        address: resolvedAddress || undefined,
        yandexUrl: yandexUrl.trim() || undefined,
        twogisUrl: twogisUrl.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Ошибка создания филиала');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = () => {
    if (!loading) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <Card padding="lg">
          <div style={{ padding: '0 0 var(--spacing-lg) 0' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
              }}
            >
              Добавить филиал вручную
            </h2>
          </div>
          <div className="modal-form">
            {error && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#fee',
                  color: '#c00',
                  borderRadius: '6px',
                }}
              >
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                Название{' '}
                <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>
                  (заполнится из URL, если оставить пустым)
                </span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Кофейня на Арбате"
                className="date-input"
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">URL на Яндекс.Картах</label>
              <input
                type="text"
                value={yandexUrl}
                onChange={(e) => setYandexUrl(e.target.value)}
                onBlur={handleYandexUrlBlur}
                onPaste={handleYandexUrlPaste}
                placeholder="https://yandex.ru/maps/org/..."
                className="date-input"
                style={{ width: '100%' }}
              />
            </div>

            {/* Resolved info preview */}
            {resolving && (
              <div className="resolve-preview">
                Определение организации...
              </div>
            )}
            {!resolving && (resolvedName || resolvedAddress) && (
              <div className="resolve-preview resolve-preview--success">
                {resolvedName && (
                  <p className="resolve-preview-line">
                    <strong>Организация:</strong> {resolvedName}
                  </p>
                )}
                {resolvedAddress && (
                  <p className="resolve-preview-line">
                    <strong>Адрес:</strong> {resolvedAddress}
                  </p>
                )}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">URL на 2ГИС</label>
              <input
                type="text"
                value={twogisUrl}
                onChange={(e) => setTwogisUrl(e.target.value)}
                placeholder="https://2gis.ru/.../firm/..."
                className="date-input"
                style={{ width: '100%' }}
              />
            </div>

            <div className="modal-actions">
              <Button variant="outline" onClick={onClose} fullWidth disabled={loading}>
                Отмена
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                fullWidth
                disabled={loading || resolving}
              >
                {loading ? 'Создание...' : 'Добавить'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
