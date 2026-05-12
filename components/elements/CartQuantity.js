'use client'
import React, { useState } from 'react'

export default function CartQuantity() {
	const [quantity, setQuantity] = useState(1)

	const handleIncrease = () => {
		setQuantity(prevQuantity => prevQuantity + 1)
	}

	const handleDecrease = () => {
		if (quantity > 1) {
			setQuantity(prevQuantity => prevQuantity - 1)
		}
	}
	return (
		<div className="wg-quantity">
			<span className="btn-quantity minus-btn" onClick={handleDecrease}>-</span>
			<input type="text" name="number" value={quantity} readOnly />
			<span className="btn-quantity plus-btn" onClick={handleIncrease}>+</span>
		</div>
	)
}

