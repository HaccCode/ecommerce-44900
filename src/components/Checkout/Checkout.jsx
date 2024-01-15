import { useState } from "react";
import { useCart } from "../../context/CartContext/CartContext";
import { db } from "../../services/firebase/firebaseConfig";
import ContactForm from "../ContactForm/ContactForm";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ReactLoading from 'react-loading';


import {
  addDoc,
  getDocs,
  collection,
  query,
  where,
  documentId,
  writeBatch,
} from "firebase/firestore";

const Checkout = () => {
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState(null);

  const { cart, total, clearCart } = useCart();

  const createOrder = async (userData) => {
    try {
      setLoading(true);
      const objOrder = {
        buyer: {
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
        },
        items: cart,
        total,
      };
      console.log(objOrder)
      const batch = writeBatch(db);
      const outOfStock = [];

      const ids = cart.map((prod) => prod.id);

      const productsCollection = query(
        collection(db, "products"),
        where(documentId(), "in", ids)
      );

      const { docs } = await getDocs(productsCollection);

      docs.forEach((doc) => {
        const dataDoc = doc.data();
        const stockDb = dataDoc.stock;

        const productAddedToCart = cart.find((prod) => prod.id === doc.id);
        const prodQuantity = productAddedToCart?.quantity;

        if (stockDb >= prodQuantity) {
          batch.update(doc.ref, { stock: stockDb - prodQuantity });
        } else {
          outOfStock.push({ id: doc.id, ...dataDoc });
        }
      });

      if (outOfStock.length === 0) {
        batch.commit();

        const orderCollection = collection(db, "orders");
        const { id } = await addDoc(orderCollection, objOrder);
        console.log("Order created successfully. Order ID:", id);

        clearCart();
        setOrderId(id);
      } else {
        //notificacon de falta de stock
        toast.warning('Producto momentaneamente sin Stock', {
          position: 'bottom-center',
          autoClose: 3000,
          theme: 'dark'
        });
      }
    } catch (error) {
      //notificacion de error generando la orden
      toast.warning('Ocurrió un problema, reintente en unos momentos', {
        position: 'bottom-center',
        autoClose: 3000,
        theme: 'dark'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1>Su Orden está siendo generada...</h1>
        <ReactLoading type={'spin'} color={'#ac7714'} height={50} width={50} />
      </div>
    );
  }

  if (orderId) {
    return <h1>El N° ID de su orden es: {orderId}</h1>;
  }

  return (
    <>
      <h1>CheckOut</h1>
      <ContactForm createOrder={createOrder} />
    </>
  );
};

export default Checkout;
