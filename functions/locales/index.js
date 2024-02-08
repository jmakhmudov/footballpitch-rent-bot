const path = require('path');
const TelegrafI18n = require('telegraf-i18n');

const i18n = new TelegrafI18n({
  defaultLanguage: 'ru',
  useSession: true,
  directory: path.resolve(__dirname, '../locales')
})

module.exports = i18n;