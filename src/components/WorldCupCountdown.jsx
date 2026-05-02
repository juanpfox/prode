import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Avatar } from './AvatarSelector';
import './WorldCupCountdown.css';

const WorldCupCountdown = ({ compact = false, hideAvatar = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Target date: June 11, 2026
  const targetDate = new Date('2026-06-11T18:00:00Z');
  const [isExpired, setIsExpired] = useState(() => new Date() - targetDate > 2 * 24 * 60 * 60 * 1000);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetDate - now;

      // Desaparece al segundo día del mundial (48 horas después)
      if (difference < -2 * 24 * 60 * 60 * 1000) {
        setIsExpired(true);
        return;
      }

      if (difference > 0) {
        // Calculate total days remaining
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        // Se detiene en 0
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000 * 60); // Update every minute

    return () => clearInterval(timer);
  }, []);

  if (isExpired) return null;

  if (compact) {
    return (
      <div className="wc-countdown-compact" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        {!hideAvatar && <Avatar id="others:1" size="sm" className="wc-countdown-trophy-avatar" />}
        <div className="wc-countdown-text">
          {t('countdown.remaining_prefix', 'Faltan')} {timeLeft.days} {t('countdown.days_short', 'd')} {timeLeft.hours} {t('countdown.hours_short', 'h')}
        </div>
      </div>
    );
  }

  return (
    <div className="wc-countdown-container">
      <div className="wc-countdown-card">
        <Avatar id="others:1" size="xl" className="wc-countdown-trophy-large" />
        <div className="wc-countdown-content">
          <h3 className="wc-countdown-title">{t('countdown.title', 'EL MUNDIAL COMIENZA EN:')}</h3>
          <div className="wc-countdown-timer">
            <div className="wc-countdown-item">
              <div className="wc-countdown-value">{timeLeft.days}</div>
              <div className="wc-countdown-label">{t('countdown.days', 'DIAS')}</div>
            </div>
            <div className="wc-countdown-item">
              <div className="wc-countdown-value">{timeLeft.hours}</div>
              <div className="wc-countdown-label">{t('countdown.hours', 'HS')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldCupCountdown;
