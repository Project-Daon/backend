import express from 'express';
const router = express.Router();

router.get('/', function (req, res) {
  res.json({ SnakeBlanket: 'https://bainble.kr/' });
});

export default router;
