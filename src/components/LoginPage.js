import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { User, GraduationCap } from 'lucide-react';
import Logo from '../imports/Logo1';

export function LoginPage({ onLogin }) {
  const [name, setName] = useState('');
  const [rut, setRut] = useState('');
  const [rutError, setRutError] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);

  // Función para limpiar el RUT (quitar puntos, guiones, espacios)
  const cleanRut = (rut) => {
    return rut.replace(/[^0-9kK]/g, '');
  };

  // Función para formatear el RUT con puntos y guion
  const formatRut = (rut) => {
    const clean = cleanRut(rut);
    if (clean.length === 0) return '';
    
    const dv = clean.slice(-1);
    const body = clean.slice(0, -1);
    
    if (body.length === 0) return clean;
    
    // Formatear con puntos
    const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formatted}-${dv}`;
  };

  // Validar RUT chileno
  const validateRut = (rut) => {
    const clean = cleanRut(rut);
    if (clean.length < 2) return false;
    
    const dv = clean.slice(-1).toLowerCase();
    const body = clean.slice(0, -1);
    
    let suma = 0;
    let multiplo = 2;
    
    for (let i = body.length - 1; i >= 0; i--) {
      suma += multiplo * parseInt(body.charAt(i));
      multiplo = multiplo < 7 ? multiplo + 1 : 2;
    }
    
    const dvEsperado = 11 - (suma % 11);
    let dvCalculado = '';
    
    if (dvEsperado === 11) {
      dvCalculado = '0';
    } else if (dvEsperado === 10) {
      dvCalculado = 'k';
    } else {
      dvCalculado = dvEsperado.toString();
    }
    
    return dv === dvCalculado;
  };

  const handleRutChange = (e) => {
    const value = e.target.value;
    const formatted = formatRut(value);
    setRut(formatted);
    
    // Validar si el RUT tiene longitud suficiente
    const clean = cleanRut(value);
    if (clean.length >= 2) {
      if (validateRut(value)) {
        setRutError('');
      } else {
        setRutError('RUT inválido');
      }
    } else {
      setRutError('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !rut || !selectedRole) return;
    
    // Validación final del RUT
    if (!validateRut(rut)) {
      setRutError('RUT inválido. Verifica el dígito verificador.');
      return;
    }
    
    onLogin({ name, rut, role: selectedRole });
  };

  return (
    <div className="min-h-screen flex flex-col bg-grey-100">
      <div className='flex-1 flex items-center justify-center p-8'>
        <Card className="bg-white rounded-3xl shadow-2xl p-16 max-w-4xl w-full text-center">
          <CardHeader className="text-center space-y-3 pb-8">
            <div class="w-40 h-40 mx-auto mb-4"><div class="relative size-full" data-name="LOGO NUEVO 1">
              <svg class="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 100 115">
                <g clip-path="url(#clip0_184_230)" id="LOGO NUEVO 1">
                  <path d="M0 114.72V95.18H15.91L13.43 99.86H5.43V103.11H15.43V107.46H5.38V114.72H0Z" fill="var(--fill-0, #C10F19)" id="Vector"></path>
                  <path d="M24.1 114.89C22.704 114.907 21.3214 114.617 20.05 114.04C17.7028 112.961 15.8644 111.015 14.92 108.61C14.4436 107.438 14.1991 106.185 14.2 104.92C14.1986 103.646 14.4537 102.384 14.95 101.21C15.4217 100.034 16.118 98.9602 17 98.05C17.9106 97.1335 18.9861 96.3973 20.17 95.88C21.4318 95.3326 22.7946 95.0566 24.17 95.07C25.5696 95.0495 26.9562 95.3398 28.23 95.92C29.9628 96.7279 31.4322 98.0089 32.4689 99.6153C33.5056 101.222 34.0676 103.088 34.09 105C34.0925 106.275 33.8374 107.536 33.34 108.71C32.8601 109.878 32.157 110.941 31.27 111.84C30.3694 112.764 29.3002 113.508 28.12 114.03C26.8568 114.601 25.4861 114.894 24.1 114.89ZM19.66 105C19.6612 105.647 19.7555 106.29 19.94 106.91C20.1103 107.504 20.392 108.061 20.77 108.55C21.1423 109.034 21.6169 109.43 22.16 109.71C22.7816 110.015 23.4677 110.166 24.16 110.15C24.8542 110.162 25.5408 110.004 26.16 109.69C26.708 109.409 27.1837 109.005 27.55 108.51C27.9183 108.008 28.1896 107.442 28.35 106.84C28.7164 105.596 28.7164 104.274 28.35 103.03C28.1825 102.436 27.8968 101.881 27.51 101.4C27.1239 100.932 26.6435 100.55 26.1 100.28C25.4784 99.9756 24.7918 99.8279 24.1 99.85C23.4077 99.8339 22.7216 99.9848 22.1 100.29C21.5531 100.568 21.0775 100.969 20.71 101.46C20.3381 101.954 20.0633 102.514 19.9 103.11C19.731 103.725 19.6502 104.362 19.66 105Z" fill="var(--fill-0, #C10F19)" id="Vector_2"></path>
                  <path d="M42.43 114.89C41.0509 114.899 39.6861 114.609 38.43 114.04C36.0828 112.961 34.2444 111.015 33.3 108.61C32.8236 107.438 32.5791 106.185 32.58 104.92C32.5786 103.646 32.8337 102.384 33.33 101.21C33.8106 100.031 34.5172 98.9576 35.41 98.05C36.3206 97.1335 37.3961 96.3973 38.58 95.88C39.8418 95.3326 41.2046 95.0566 42.58 95.07C43.9796 95.0495 45.3662 95.3398 46.64 95.92C47.815 96.4618 48.8718 97.2297 49.75 98.18C50.6126 99.1071 51.2913 100.19 51.75 101.37C52.2134 102.535 52.4509 103.777 52.45 105.03C52.4559 106.304 52.2042 107.566 51.71 108.74C50.7182 111.122 48.8443 113.028 46.48 114.06C45.2057 114.626 43.8241 114.909 42.43 114.89ZM38 105C37.9962 105.647 38.0906 106.291 38.28 106.91C38.451 107.502 38.7289 108.058 39.1 108.55C39.7443 109.318 40.6274 109.847 41.6082 110.054C42.5889 110.261 43.6107 110.133 44.51 109.69C45.0558 109.406 45.5309 109.002 45.9 108.51C46.2683 108.008 46.5396 107.442 46.7 106.84C47.0523 105.594 47.0523 104.276 46.7 103.03C46.5242 102.439 46.2393 101.886 45.86 101.4C45.4739 100.932 44.9935 100.55 44.45 100.28C43.8284 99.9756 43.1418 99.8279 42.45 99.85C41.7577 99.8339 41.0716 99.9848 40.45 100.29C39.9031 100.568 39.4275 100.969 39.06 101.46C38.6888 101.956 38.4109 102.515 38.24 103.11C38.0757 103.726 37.995 104.362 38 105Z" fill="var(--fill-0, #C10F19)" id="Vector_3"></path>
                  <path d="M51.82 114.72V95.18H59.35C60.8106 95.1474 62.2628 95.4092 63.62 95.95C64.7792 96.4019 65.8266 97.1 66.6899 97.996C67.5531 98.892 68.2116 99.9647 68.62 101.14C69.0458 102.354 69.2589 103.633 69.25 104.92C69.2658 106.285 69.0284 107.641 68.55 108.92C68.1079 110.076 67.4263 111.126 66.55 112C65.66 112.876 64.5975 113.557 63.43 114C62.151 114.477 60.795 114.714 59.43 114.7L51.82 114.72ZM63.76 104.92C63.7679 104.222 63.6667 103.527 63.46 102.86C63.2826 102.273 62.9865 101.728 62.59 101.26C62.2043 100.83 61.7301 100.489 61.2 100.26C60.6171 100.005 59.9861 99.8791 59.35 99.89H57.2V110H59.35C59.9939 110.015 60.6329 109.885 61.22 109.62C61.7626 109.371 62.2414 109.002 62.62 108.54C63.0063 108.061 63.295 107.51 63.47 106.92C63.6685 106.272 63.7663 105.598 63.76 104.92Z" fill="var(--fill-0, #C10F19)" id="Vector_4"></path>
                  <path d="M82.6 110.32V115H68.6V95.45H82.35L79.87 100.13H74V102.88H81.12V107.23H74V110.32H82.6Z" fill="var(--fill-0, #C10F19)" id="Vector_5"></path><path d="M87.09 95.45L90.65 101.62L94.21 95.45H100L93.46 105.36L99.78 115H94L90.66 109.11L87.31 115H81.49L87.81 105.36L81.27 95.45H87.09Z" fill="var(--fill-0, #C10F19)" id="Vector_6"></path>
                  <path d="M31 64.29C31 64.29 8.57 61.18 11.07 47.23C12.62 38.56 24.81 30.63 29.33 32.14C29.33 32.14 28.23 16.83 48.81 19.37C62.43 21 65.34 31.54 65.34 31.54C65.34 31.54 79 20.62 87.4 34.08C95.8 47.54 73.52 61.94 68.49 62.78C68.49 62.78 69.4 76.05 68.43 83.39C68.43 83.39 60.73 82.39 48.43 85.17C36.13 87.95 29.25 81.52 29.25 81.52L31 64.29Z" fill="var(--fill-0, #241F1C)" id="Vector_7"></path>
                  <path d="M33.33 63.93C33.33 63.93 43.33 64.42 50.14 63.13C56.95 61.84 64.71 62.65 66.39 63.94C66.39 63.94 67.71 77.35 67.27 81.41C67.27 81.41 61.37 80.3 49.8 82.95C43.6876 84.1998 37.3337 83.402 31.72 80.68L33.33 63.93Z" fill="var(--fill-0, #C10F19)" id="Vector_8"></path>
                  <path d="M36 40.26C32.93 37.36 28.15 22.92 42.53 21.57C63.2 19.63 63.82 38.88 63.82 38.88C65.34 31.54 79.22 26.13 84.1 34C90.51 44.41 76.66 57.69 68.29 61.05C68.29 61.05 65.77 59.67 63.91 60.27C63.91 60.27 65.91 47.59 67.07 46.58C63.9793 50.3554 62.079 54.9634 61.61 59.82C61.61 59.82 54.61 59.73 53.76 60.34C53.76 60.34 52.76 49.95 51.76 48.79C51.76 48.79 51.88 60.17 51.27 60.79C50.66 61.41 41.48 63.03 39.02 62.66C39.02 62.66 38.27 55.33 36.19 54.16C36.19 54.16 38.06 59.49 37.71 62.62C37.71 62.62 12.59 62.26 13.14 49.53C13.34 45.62 16 42 18.49 39.41C22.8 34.96 28.37 32.26 32.59 37.33C33.6598 38.3819 34.799 39.3607 36 40.26Z" fill="var(--fill-0, #C10F19)" id="Vector_9"></path>
                  <path d="M19.13 40.12C19.13 40.12 23.71 37.04 28.21 38.43C30.6929 39.1649 33.0873 40.1709 35.35 41.43C35.35 41.43 32.35 36.95 27.76 36.63C23.17 36.31 19.13 40.12 19.13 40.12Z" fill="var(--fill-0, #83121E)" id="Vector_10"></path>
                  <path d="M28.34 44.61C28.34 44.61 38.11 55.93 35.58 61.35C35.58 61.35 30.41 61.77 27.98 59.8C27.98 59.8 32.32 59.48 32.2 55.93C32.08 52.38 28.34 44.61 28.34 44.61Z" fill="var(--fill-0, #83121E)" id="Vector_11"></path>
                  <path d="M42.16 61C42.16 61 48.66 59.86 49.05 53C49.1345 50.1467 49.3949 47.3012 49.83 44.48C49.83 44.48 50.13 53.9 49.38 58.84C49 61.52 42.16 61 42.16 61Z" fill="var(--fill-0, #83121E)" id="Vector_12"></path>
                  <path d="M55.29 58.82C56.8869 58.0278 58.2052 56.7688 59.07 55.21C61.07 50.81 63.73 45.38 65.58 45.33C65.58 45.33 61.9 50.05 61.58 54.03C61.26 58.01 58.21 58.82 55.29 58.82Z" fill="var(--fill-0, #83121E)" id="Vector_13"></path>
                  <path d="M66.22 52.16C66.22 52.16 65.08 57.88 70.35 56.16C76.52 54 84 46.75 83.81 38.26C83.7945 42.8701 82.2623 47.347 79.45 51C74.59 57.38 67.67 60.8 66 57.76C65.49 56.75 65.66 54.88 66.22 52.16Z" fill="var(--fill-0, #83121E)" id="Vector_14"></path>
                  <path d="M62.06 42.72C61.21 36.36 60.33 33.59 56.74 29.39C51.64 23.39 41.91 23.65 41.91 23.65C41.91 23.65 52.7 21.38 58.51 29.09C61.3699 33.023 62.6379 37.8916 62.06 42.72Z" fill="var(--fill-0, #83121E)" id="Vector_15"></path>
                  <path d="M36.54 64.91C40.3384 65.4573 44.1935 65.4875 48 65C58.81 63.12 64.75 63.19 65.22 65.85C65.69 68.51 66.39 77.58 65.96 79.4C65.96 79.4 56.51 78.24 50.51 81.61C50.51 81.61 51.89 78.96 60.51 78.16C65.74 77.67 63.67 72.08 63.1 68.43C62.99 67.73 62.44 66.86 60.59 67.11C58.08 67.47 39.43 69 36.54 64.91Z" fill="var(--fill-0, #83121E)" id="Vector_16"></path>
                  <path d="M28.37 81.86L29.12 73.53C29.12 73.53 20.28 89.08 22.87 91.26C25.46 93.44 33.16 84.61 33.16 84.61C31.4199 83.9695 29.8005 83.0398 28.37 81.86ZM28.37 86.63C27.74 87.75 26.59 88.29 25.79 87.84C24.99 87.39 24.87 86.12 25.5 85.01C26.13 83.9 27.28 83.36 28.08 83.8C28.88 84.24 29 85.52 28.34 86.63H28.37Z" fill="var(--fill-0, #C10F19)" id="Vector_17"></path>
                  <path d="M25.15 87C25.15 87 24.62 89.77 27.29 89.11C30.23 88.38 30.11 84.61 28.46 84.18C28.6642 84.6367 28.7405 85.1404 28.6806 85.6371C28.6207 86.1338 28.4269 86.6049 28.12 87C26.16 89.26 25.15 87 25.15 87Z" fill="var(--fill-0, #83121E)" id="Vector_18"></path>
                  <path d="M69.62 82L69.47 73.8C69.47 73.8 78.18 89.42 74.93 91.22C71.68 93.02 63.59 83.85 63.59 83.85C70.13 85 69.62 82 69.62 82ZM69 86.26C69.2568 86.7821 69.6806 87.2034 70.2042 87.4571C70.7278 87.7107 71.3212 87.7821 71.89 87.66C72.89 87.32 73.15 86.14 72.53 85.02C72.2748 84.4961 71.8517 84.0726 71.3279 83.8171C70.8042 83.5615 70.21 83.4887 69.64 83.61C68.68 84 68.39 85.14 69 86.26Z" fill="var(--fill-0, #C10F19)" id="Vector_19"></path>
                  <path d="M72.71 87C72.71 87 73 89.62 70 88.71C66.64 87.71 67.17 84.16 69.15 83.94C68.8752 84.3345 68.7371 84.8081 68.757 85.2885C68.7768 85.7689 68.9535 86.2296 69.26 86.6C71.29 89 72.71 87 72.71 87Z" fill="var(--fill-0, #83121E)" id="Vector_20"></path>
                  <path d="M88.79 8.65C90.66 3.27 86.92 1.35 84.18 2.13C84.18 2.13 80.72 1.69 79.18 2.72C77.64 3.75 73.31 2.88 69 8.93C64.69 14.98 61.71 22.76 61.09 24.08C61.09 24.08 61.89 24.19 62.09 24.77C62.09 24.77 68.77 11.24 71.09 10.44L63 25.33L63.57 25.81C63.57 25.81 71.06 10.44 74.64 7.58C76.07 6.44 76.86 6.66 76.86 6.66C72.75 9.66 64.78 24.11 63.6 26.72C63.7935 26.8809 63.962 27.0696 64.1 27.28C64.1 27.28 74.64 7.58 78.86 6.12C79.6544 5.79328 80.5456 5.79328 81.34 6.12C76.63 11.95 66.44 28.43 65.55 29.84L65.47 30.61L67.15 29.83C67.15 29.83 83.22 7.6 83.15 6.14C83.15 6.14 86.63 7.51 87.06 9.43C87.49 11.35 85.94 13.3 85.06 14.96C84.18 16.62 76.82 25.35 75.96 26.41C76.4121 26.363 76.8679 26.363 77.32 26.41C77.32 26.41 85.14 17.41 85.81 15.51C85.81 15.51 85.51 19.75 78.5 26.58C78.8006 26.58 79.0964 26.6556 79.36 26.8C83.9064 22.787 86.9415 17.338 87.96 11.36C87.96 11.36 89.96 16.58 85.43 22.62C84.43 23.93 82.07 26.62 81.14 27.55C81.7427 27.7081 82.3189 27.9541 82.85 28.28C82.85 28.28 87.52 23.92 89.03 19.77C90.3078 16.1579 90.2225 12.2036 88.79 8.65ZM72.45 8.17C70.8 9.17 67.14 13.87 67.14 13.87C68.8 10.31 73.2 5.12 76.21 4.43C75.27 5.22 73.66 7.4 72.45 8.17ZM77.68 5.41C76.68 5.7 75.75 5.82 76.33 5.61C76.33 5.61 80.19 2.51 80.13 3.85C80.1 4.5 78.63 5.12 77.68 5.41ZM80.78 4.93C80 4.82 81.3 4 82.17 4C83.04 4 82.17 4.88 82.17 4.88C81.7152 4.99343 81.2417 5.01047 80.78 4.93ZM75.05 17.28C74.68 17.86 74.71 18.6 73.82 19C73.325 19.3828 72.9132 19.8626 72.61 20.41C71.48 22.29 70.27 24.41 70.27 24.41C70.27 24.41 71.53 22.05 72.61 20.41C73.36 19.17 74.08 18.01 74.39 17.62C75.06 16.78 81.77 6.08 81.77 6.08H82.45C82.45 6.08 75.41 16.69 75.05 17.28ZM83.9 4.92C84.9 4.26 86.83 7.3 86.83 7.3C85.54 5.67 83.19 5.39 83.9 4.92ZM88 7.36C88 7.36 86.26 3.22 85 2.82C85.5508 2.70318 86.1245 2.76418 86.6385 2.9942C87.1524 3.22422 87.5801 3.6114 87.86 4.1C88.1007 4.60624 88.2372 5.15573 88.2612 5.71577C88.2853 6.27582 88.1964 6.83499 88 7.36Z" fill="var(--fill-0, #C10F19)" id="Vector_21"></path>
                  <path d="M28.25 8.06L27.92 7.45H17.6L17.13 8.06H28.25Z" fill="var(--fill-0, #C10F19)" id="Vector_22"></path><path d="M28.82 9.19C28.7924 9.21632 28.7576 9.23374 28.72 9.24H16.27C16.08 9.49 15.91 9.73 15.75 9.96H29.21L28.82 9.19Z" fill="var(--fill-0, #C10F19)" id="Vector_23"></path><path d="M28.48 8.52H16.8C16.73 8.61 16.66 8.69 16.6 8.78H28.6L28.48 8.52Z" fill="var(--fill-0, #C10F19)" id="Vector_24"></path><path d="M30 11.52H14.75C14.61 11.76 14.47 12.02 14.33 12.29H30.33L30 11.52Z" fill="var(--fill-0, #C10F19)" id="Vector_25"></path><path d="M30.92 13.61C30.7867 13.33 30.6567 13.04 30.53 12.74H14.1C13.96 13.03 13.82 13.31 13.69 13.61H30.92Z" fill="var(--fill-0, #C10F19)" id="Vector_26"></path><path d="M27.67 7C27.58 6.82 27.48 6.65 27.39 6.48H18.39L18 7H27.67Z" fill="var(--fill-0, #C10F19)" id="Vector_27"></path><path d="M13.5 14.06C13.36 14.36 13.24 14.66 13.11 14.96H31.5L31.12 14.08L13.5 14.06Z" fill="var(--fill-0, #C10F19)" id="Vector_28"></path><path d="M29 5.11C27.42 2.2 23.73 -2.54 19.74 1.67C11.45 10.43 11.3 13.49 10.34 16.67C9.88 18.22 9.01 20.02 11.48 23.06L19.48 33.7C19.48 33.7 23.78 30.77 28.28 31.08C28.28 31.08 29.67 20.61 36.05 19.54C36 19.57 30.58 8 29 5.11ZM19.77 32.33L12.71 19.72L15 16.27C13.68 21.2 19.77 32.33 19.77 32.33ZM32.66 19.63C32.5198 18.178 32.1834 16.7516 31.66 15.39H13.11C13.0788 15.3908 13.0479 15.384 13.02 15.37C12.9921 15.3561 12.9681 15.3354 12.95 15.31C12.1 17.31 11.45 19.22 11.29 19.72C11 20.58 19.49 32.86 19.49 32.86C19.49 32.86 9.91 20.11 10.62 18.86C11.33 17.61 11.5 15.86 14.32 10.22C16.1709 6.69511 18.8942 3.7033 22.23 1.53L20.31 4H25.85C25.1287 2.73314 24.1263 1.64865 22.92 0.83C22.92 0.83 24.51 0.52 27.24 4.62C29.97 8.72 34.61 18.35 34.61 18.35C33.8741 18.6286 33.2084 19.0656 32.66 19.63Z" fill="var(--fill-0, #C10F19)" id="Vector_29"></path><path d="M26.83 5.52H19.09L18.69 6.03H27.13L26.83 5.52Z" fill="var(--fill-0, #C10F19)" id="Vector_30"></path><path d="M29.43 10.41H15.43C15.26 10.65 15.11 10.88 15 11.07H29.74L29.43 10.41Z" fill="var(--fill-0, #C10F19)" id="Vector_31"></path><path d="M26.56 5.07C26.42 4.84 26.28 4.62 26.13 4.4H20C19.83 4.61 19.66 4.82 19.49 5.05L26.56 5.07Z" fill="var(--fill-0, #C10F19)" id="Vector_32"></path></g><defs><clipPath id="clip0_184_230"><rect fill="white" height="115" width="100"></rect></clipPath></defs></svg></div></div>
            <CardDescription className="text-sm italic text-gray-400 mb-8' style=font-family:'calibri',sans-serif; font-weight: 500;">
              El sabor de siempre, en formato digital
            </CardDescription>
            <CardTitle className="text-2xl mb-8 text-gray-600 whitespace-nowrap">FOODEX - Taller Gastronómico</CardTitle>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="mb-12">
                <label className="block text-xl text-gray-700 mb-4 text-left">Nombre</label>
                <Input type="text" placeholder="Ingresa tu nombre" value={name} onChange={(e) => setName(e.target.value)} required
                  className="w-full px-6 py-6 text-4xl rounded-xl focus:outline-none transition-colors bg-gray-200 placeholder-gray-400 placeholder:text-xl"
                />
              </div>
              <div>
                <label className="block text-xl text-gray-700 mb-4 text-left">RUT</label>
                <Input 
                  type="text" 
                  placeholder="Ej: 12.345.678-9" 
                  value={rut} 
                  onChange={handleRutChange}
                  required
                  className={`w-full px-6 py-6 text-4xl rounded-xl focus:outline-none transition-colors bg-gray-200 placeholder-gray-400 placeholder:text-xl ${
                    rutError ? 'border-2 border-red-500' : ''
                  }`}
                />
                {rutError && (
                  <p className="text-red-600 text-lg mt-2 text-left">{rutError}</p>
                )}
              </div>

              <div className="space-y-4">
                <label className="text-xl"></label>
                <div className="grid grid-cols-2 gap-8 mb-12">
                  <button type="button" onClick={() => setSelectedRole('alumno')} className={`p-10 rounded-2xl border-4 transition-all border-gray-300 hover:border-red-600 ${selectedRole === 'alumno' ? 'border-red-600 bg-red-50'
                    : 'border-gray-300 hover:border-red-600'
                    }`}>
                    <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${selectedRole === 'alumno' ? 'bg-red-600' : 'bg-gray-200'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-graduation-cap w-12 h-12 ${selectedRole === 'alumno' ? 'text-white' : 'text-gray-600'}`} aria-hidden="true">
                        <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
                        <path d="M22 10v6"></path>
                        <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
                      </svg>
                    </div>
                    <p className="text-2xl text-center">Alumno</p>
                  </button>

                  <button
                    type="button" onClick={() => setSelectedRole('profesor')} className={`p-10 rounded-2xl border-4 transition-all border-gray-300 hover:border-red-600 ${selectedRole === 'profesor' ? 'border-red-600 bg-red-50'
                      : 'border-gray-300 hover:border-red-600'
                      }`}>
                    <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${selectedRole === 'profesor' ? 'bg-red-600' : 'bg-gray-200'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-book-open w-12 h-12 ${selectedRole === 'profesor' ? 'text-white' : 'text-gray-600'}`} aria-hidden="true">
                        <path d="M12 7v14"></path>
                        <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
                      </svg>
                    </div>
                    <p className="text-2xl text-center">Profesor</p>
                  </button>
                </div>
              </div>

              <Button
                type="submit" 
                className="w-full bg-red-600 text-white py-10 rounded-xl hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-2xl"
                disabled={!name || !rut || !selectedRole || !!rutError}>
                Ingresar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <footer className='bg-gray-800 text-white py-6'>
        <div className='text-center'>
          <p className='text-sm text-gray-400'>© 2024 FOODEX - Taller Gastronómico. Todos los derechos reservados.</p>
          <p className='text-xs text-gray-500 mt-2'>Sistema de gestión de fichas técnicas gastronómicas | Registro de propiedad intelectual</p>
        </div>
      </footer>
    </div>
  );
}
