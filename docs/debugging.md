# Debugging Guide

- **Errores de UI/CSS**: Usar React Developer Tools e inspeccionar variables CSS globales en `:root`.
- **Errores de Fetch/Datos**: Verificar la pestaña Network y el estado de TanStack Query.
- **Errores Backend**: Usar `npx supabase functions serve` para probar Edge Functions, y revisar los logs de Supabase en el Dashboard para RLS y Policies.