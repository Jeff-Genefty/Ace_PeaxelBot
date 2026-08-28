import express from 'express';

const router = express.Router();

/** Anciennes routes publiques — retourne 404 pour ne pas exposer l'admin. */
router.get('/login', (_req, res) => res.status(404).send('Not found'));
router.get('/dashboard', (_req, res) => res.status(404).send('Not found'));
router.get('/dashboard/analytics', (_req, res) => res.status(404).send('Not found'));
router.post('/login', (_req, res) => res.status(404).send('Not found'));
router.get('/logout', (_req, res) => res.redirect('/'));

export default router;
