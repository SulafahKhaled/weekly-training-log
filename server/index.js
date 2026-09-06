import os from 'node:os';
import app from './app.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  const lanIps = Object.values(nets)
    .flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal)
    .map((n) => n.address);

  console.log(`\nWeekly Training Log server running on port ${PORT}`);
  console.log(`  Local:   http://localhost:${PORT}`);
  lanIps.forEach((ip) => console.log(`  Network: http://${ip}:${PORT}  (use this on other devices)`));
  console.log('');
});
