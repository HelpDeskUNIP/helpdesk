import { Router } from 'express'
import { AuthController } from '../controllers/autoController'

const router = Router()

router.post('/register', AuthController.registrar)
router.post('/login', AuthController.login)
router.get('/profile', AuthController.perfil)
router.post('/change-password', AuthController.alterarSenha)
router.post('/validate-token', AuthController.validarToken)

export default router 