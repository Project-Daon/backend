import express from 'express';

const router = express.Router();

router.get('/', function (req, res) {
  res.json({ ProjectDaon: 'https://daon.today/' });
});

export default router;
