import { useState, useEffect } from 'react';
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

  useEffect(() => {
    loadLocations();
  }, []);

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
                    {loc.googleUrl ? (
                      <a href={loc.googleUrl} target="_blank" rel="noopener noreferrer" className="location-badge platform-badge--google">
                        Google ↗
                      </a>
                    ) : (
                      <a
                        href={`https://www.google.com/maps/search/${encodeURIComponent(loc.name + (loc.address ? ', ' + loc.address : ''))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="location-badge platform-badge--google-search"
                      >
                        Найти на Google →
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

const AddLocationModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [yandexUrl, setYandexUrl] = useState('');
  const [twogisUrl, setTwogisUrl] = useState('');
  const [googleUrl, setGoogleUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Укажите название');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await locationApi.createLocation({
        name: name.trim(),
        address: address.trim() || undefined,
        yandexUrl: yandexUrl.trim() || undefined,
        twogisUrl: twogisUrl.trim() || undefined,
        googleUrl: googleUrl.trim() || undefined,
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
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Добавить филиал
            </h2>
          </div>
          <div className="modal-form">
            {error && (
              <div style={{ padding: '12px', backgroundColor: '#fee', color: '#c00', borderRadius: '6px' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Название *</label>
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
              <label className="form-label">Адрес</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Москва, ул. Арбат, 12"
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
                placeholder="https://yandex.ru/maps/org/..."
                className="date-input"
                style={{ width: '100%' }}
              />
            </div>

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

            <div className="form-group">
              <label className="form-label">URL на Google Maps</label>
              <input
                type="text"
                value={googleUrl}
                onChange={(e) => setGoogleUrl(e.target.value)}
                placeholder="https://maps.google.com/..."
                className="date-input"
                style={{ width: '100%' }}
              />
            </div>

            <div className="modal-actions">
              <Button variant="outline" onClick={onClose} fullWidth disabled={loading}>
                Отмена
              </Button>
              <Button variant="primary" onClick={handleSubmit} fullWidth disabled={loading}>
                {loading ? 'Создание...' : 'Добавить'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
