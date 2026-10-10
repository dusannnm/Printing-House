import express from 'express'
import cors from 'cors'
import path from 'path'
import mongoose from 'mongoose'
import UserRouter from './routers/user.router'
import ProductRouter from './routers/product.router'
import OrderRouter from './routers/order.router'
import CartRouter from './routers/cart.router'
import ProcurementRouter from './routers/procurement.router'
import CategoryRouter from './routers/category.router'
import StatsRouter from './routers/stats.router'

const app = express()
app.use(cors())
app.use(express.json())

// Poslate slike profila i proizvoda idu direktno sa diska
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")))

// autoIndex je iskljucen da bi indekse pravio db/seed.js
mongoose.connect('mongodb://127.0.0.1:27017/printingHouse2026', { autoIndex: false })
    .catch((err) => console.error("Mongoose connection error:", err))
const connection = mongoose.connection
connection.once("open", () => {
    console.log("DB connection done")
})

const router = express.Router()
router.use("/users", UserRouter)
router.use("/products", ProductRouter)
router.use("/orders", OrderRouter)
router.use("/carts", CartRouter)
router.use("/procurements", ProcurementRouter)
router.use("/categories", CategoryRouter)
router.use("/stats", StatsRouter)

app.use("/", router)
app.listen(4000, () => console.log("Express running on port 4000!"))
