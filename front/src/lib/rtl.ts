import i18n from '../i18next';

export async function applyLocale(lang: string) {
  localStorage.setItem('locale', lang);
  await i18n.changeLanguage(lang);
  const dir = i18n.dir(lang);
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
  const css = document.getElementById('bootstrap-css');
  if (css) {
    css.setAttribute('href', lang === 'ar'
      ? '/css/bootstrap.rtl.min.css'
      : '/css/bootstrap.min.css'
    );
  }
}
