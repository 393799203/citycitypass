import React from 'react';
import { LocationForm } from '../../types/dispatch';
import { useTranslation } from 'react-i18next';

interface LocationModalProps {
  isOpen: boolean;
  locationForm: LocationForm;
  onClose: () => void;
  onSubmit: () => void;
  onFormChange: (key: keyof LocationForm, value: string) => void;
}

export default function LocationModal({
  isOpen,
  locationForm,
  onClose,
  onSubmit,
  onFormChange
}: LocationModalProps) {
  const { t } = useTranslation();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">{t('transport.updateLocationTitle')}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('transport.addressLabel')}</label>
            <input
              type="text"
              value={locationForm.address}
              onChange={e => onFormChange('address', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder={t('transport.addressPlaceholder')}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('transport.latitudeLabel')}</label>
              <input
                type="text"
                value={locationForm.latitude}
                onChange={e => onFormChange('latitude', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder={t('transport.latitudePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('transport.longitudeLabel')}</label>
              <input
                type="text"
                value={locationForm.longitude}
                onChange={e => onFormChange('longitude', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder={t('transport.longitudePlaceholder')}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('transport.locationDescLabel')}</label>
            <input
              type="text"
              value={locationForm.location}
              onChange={e => onFormChange('location', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder={t('transport.locationDescPlaceholder')}
            />
          </div>
          <p className="text-xs text-gray-500">{t('transport.geocodeTip')}</p>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            {t('transport.cancel')}
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            {t('transport.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
