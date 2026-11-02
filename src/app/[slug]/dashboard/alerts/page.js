'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { registerServiceWorker, subscribeUser } from '@/libs/notifications';

export default function Alerts() {
  const { slug } = useParams();
  const [alerts, setAlerts] = useState([]);
  const [formData, setFormData] = useState({
    id: null,
    title: '',
    description: '',
    alertTime: '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Obtener alertas
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/${slug}/alerts`)
      .then((res) => res.json())
      .then((data) => setAlerts(data))
      .catch((error) => console.error('Error al cargar alertas:', error));
  }, [slug]);

  useEffect(() => {
    const setupNotifications = async () => {
      if (Notification.permission === 'granted') {
        setIsSubscribed(true);
      } else if (Notification.permission === 'denied') {
        setIsSubscribed(false);
      }
    };
    setupNotifications();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = isEditing ? 'PUT' : 'POST';
      const url = `/api/${slug}/alerts`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedAlert = await response.json();
        setAlerts((prev) =>
          isEditing
            ? prev.map((a) => (a.id === updatedAlert.id ? updatedAlert : a))
            : [...prev, updatedAlert]
        );
        setFormData({ id: null, title: '', description: '', alertTime: '' });
        setIsEditing(false);
        setIsFormVisible(false);
      } else {
        console.error('Error al guardar la alerta');
      }
    } catch (error) {
      console.error('Error al guardar la alerta:', error);
    }
  };

  const sendNofitication = async () => {
    try {
      const url = `/api/${slug}/send-notifications`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('Notificaciones enviadas con exito');
      } else {
        console.error('Error al guardar la alerta');
      }
    } catch (error) {
      console.error('Error al anviar la notificación:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`/api/${slug}/alerts`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        setAlerts((prev) => prev.filter((alert) => alert.id !== id));
      } else {
        console.error('Error al eliminar la alerta');
      }
    } catch (error) {
      console.error('Error al eliminar la alerta:', error);
    }
  };

  const handleSubscribe = async () => {
    try {
      await registerServiceWorker();
      await subscribeUser(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
      setIsSubscribed(true);
    } catch (error) {
      console.error('Error al suscribirse:', error);
    }
  };

  const handleRequestPermission = () => {
    if (Notification.permission === 'denied') {
      alert('Para recibir notificaciones, por favor, habilita los permisos de notificación en la configuración de tu navegador.');
      return;
    }

    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        handleSubscribe();
      } else {
        alert('Las notificaciones están deshabilitadas.');
      }
    });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-slate-200">Gestión de Alertas</h1>

      <button
        onClick={() => setIsFormVisible(!isFormVisible)}
        className="mb-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
      >
        {isFormVisible ? 'Cancelar' : 'Agregar Nueva Alerta'}
      </button>

      {isFormVisible && (
        <form
          onSubmit={handleSubmit}
          className="p-4 rounded-lg border border-white bg-gray-950 mb-6"
        >
          <h2 className="text-xl font-semibold text-slate-200 mb-4">
            {isEditing ? 'Editar Alerta' : 'Agregar Alerta'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Título de la Alerta"
              required
              className="p-2 rounded border border-gray-700 bg-gray-800 text-white"
            />
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Descripción"
              className="p-2 rounded border border-gray-700 bg-gray-800 text-white"
            />
            <input
              type="datetime-local"
              name="alertTime"
              value={formData.alertTime}
              onChange={handleChange}
              required
              className="p-2 rounded border border-gray-700 bg-gray-800 text-white"
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="repeatWeekly"
                checked={formData.repeatWeekly}
                onChange={(e) => setFormData({ ...formData, repeatWeekly: e.target.checked })}
                className="bg-gray-800 text-white"
              />
              <label className="text-white">Repetir semanalmente</label>
            </div>
            {formData.repeatWeekly && (
              <select
                name="repeatDay"
                value={formData.repeatDay}
                onChange={handleChange}
                className="p-2 rounded border border-gray-700 bg-gray-800 text-white"
              >
                <option value="">Selecciona el día</option>
                {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((day, index) => (
                  <option key={index} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            type="submit"
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            {isEditing ? 'Actualizar Alerta' : 'Agregar Alerta'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="relative p-4 rounded-lg bg-gray-800 border border-gray-700"
          >
            <button
              onClick={() => handleDelete(alert.id)}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-200 text-3xl"
            >
              &times;
            </button>
            <h3 className="text-lg font-semibold text-white">{alert.title}</h3>
            <p className="text-sm text-gray-400">{alert.description}</p>
            <p className="text-sm text-gray-400">
              Fecha y Hora: {new Date(alert.alertTime).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
      <hr className='my-5' />
      <div className='flex justify-between'>
        <div>
          {!isSubscribed && (
            <div>
              <button
                onClick={handleRequestPermission}
                className="mt-2 bg-emerald-700 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Activar Notificaciones
              </button>
            </div>
          )}
        </div>
        <button
          onClick={sendNofitication}
          className="mt-2 bg-emerald-700 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Enviar Notificaciones Ahora
        </button>
      </div>
    </div>
  );
}
