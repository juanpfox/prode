import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './WorldCupCountdown.css';

const WorldCupCountdown = () => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Target date: June 11, 2026
  const targetDate = new Date('2026-06-11T18:00:00Z');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetDate - now;

      if (difference > 0) {
        // Calculate total days remaining
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        setTimeLeft({ days, hours, minutes, seconds });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000 * 60); // Update every minute

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="wc-countdown-container">
      <div className="wc-countdown-card">
        <div className="wc-countdown-trophy">
          <div className="wc-trophy-avatar" />
        </div>
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
