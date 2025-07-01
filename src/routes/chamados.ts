import { Router } from 'express'
import { ChamadosController } from '../controllers/chamadoController'

const router = Router()

router.post('/', ChamadosController.criar)
router.get('/', ChamadosController.listar)
router.get('/:id', ChamadosController.obterPorId)
router.put('/:id', ChamadosController.atualizar)
router.delete('/:id', ChamadosController.deletar)
router.post('/:id/atribuir', ChamadosController.atribuir)

export default router 