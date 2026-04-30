import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './WorldCupCountdown.css';

const WorldCupCountdown = () => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState({
    months: 0,
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
        // Calculate months approximately (30.44 days per month)
        // For better accuracy, we can compare dates
        let months = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
        
        // Adjust if current day is after target day
        const tempDate = new Date(now);
        tempDate.setMonth(now.getMonth() + months);
        
        if (tempDate > targetDate) {
          months--;
        }

        // Calculate remaining days
        const lastMonthDate = new Date(now);
        lastMonthDate.setMonth(now.getMonth() + months);
        const daysDiff = Math.floor((targetDate - lastMonthDate) / (1000 * 60 * 60 * 24));
        
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        setTimeLeft({ months, days: daysDiff, hours, minutes, seconds });
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
          <span role="img" aria-label="trophy">🏆</span>
        </div>
        <div className="wc-countdown-content">
          <h3 className="wc-countdown-title">{t('countdown.title', 'EL MUNDIAL COMIENZA EN:')}</h3>
          <div className="wc-countdown-timer">
            <div className="wc-countdown-item">
              <div className="wc-countdown-value">{timeLeft.months}</div>
              <div className="wc-countdown-label">{t('countdown.months', 'MES')}</div>
            </div>
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
