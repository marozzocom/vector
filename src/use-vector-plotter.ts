import { useCallback, useEffect, useState, type RefObject } from "react";

// Vector type and operations
type Vector = { x: number; y: number };

// Plotted vector type
type PlottedVector = {
	vector: Vector;
	color?: string;
	opacity?: number;
};

type Shape = Array<PlottedVector>;

// Shapes type
type Shapes = Array<Shape>;

const createVector = (x: number, y: number): Vector => ({ x, y });

const addVectors = (v1: Vector, v2: Vector): Vector => ({
	x: v1.x + v2.x,
	y: v1.y + v2.y,
});

const subtractVectors = (v1: Vector, v2: Vector): Vector => ({
	x: v1.x - v2.x,
	y: v1.y - v2.y,
});

const scaleVector = (v: Vector, scalar: number): Vector => ({
	x: v.x * scalar,
	y: v.y * scalar,
});

const vectorLength = (v: Vector): number => Math.sqrt(v.x * v.x + v.y * v.y);

const normalizeVector = (v: Vector): Vector => {
	const len = vectorLength(v);
	return len > 0 ? scaleVector(v, 1 / len) : createVector(0, 0);
};

const useVectorPlotter = (
	canvasRef: RefObject<HTMLCanvasElement>,
	scale = 50,
) => {
	const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
	const [shapes, setShapes] = useState<Shapes>([[]]);
	const [selectedShape, setSelectedShape] = useState<number | null>(0);
	const [selectedVector, setSelectedVector] = useState<number | null>(null);
	const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

	const selectShape = (index: number) => {
		setSelectedShape(index);
	};

	const selectVector = (index: number) => {
		setSelectedVector(index);
	};

	function distanceToLineSegment(p: Vector, v: Vector, w: Vector): number {
		const lengthSquared = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
		if (lengthSquared === 0)
			return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);

		let t =
			((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / lengthSquared;
		t = Math.max(0, Math.min(1, t));

		const nearestX = v.x + t * (w.x - v.x);
		const nearestY = v.y + t * (w.y - v.y);

		return Math.sqrt((p.x - nearestX) ** 2 + (p.y - nearestY) ** 2);
	}

	function selectShapeWithPointer(
		clickPoint: Vector,
		threshold: number,
	): number {
		for (let i = 0; i < shapes.length; i++) {
			const shape = shapes[i];
			for (let j = 0; j < shape.length; j++) {
				const startPoint = shape[j];
				const endPoint = shape[(j + 1) % shape.length]; // Wrap around to the first point

				const distance = distanceToLineSegment(
					clickPoint,
					startPoint.vector,
					endPoint.vector,
				);

				if (distance <= threshold) {
					return i; // Return the index of the selected shape
				}
			}
		}

		return -1; // No shape selected
	}

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const context = canvas.getContext("2d");
		if (!context) return;

		setContext(context);

		const resizeCanvas = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			setCanvasSize({ width: canvas.width, height: canvas.height });
		};

		resizeCanvas();
		window.addEventListener("resize", resizeCanvas);

		return () => {
			window.removeEventListener("resize", resizeCanvas);
		};
	}, [canvasRef]);

	const drawVector = useCallback(
		(vector: Vector, color: string, opacity: number) => {
			if (!context) return;

			const centerX = canvasSize.width / 2;
			const centerY = canvasSize.height / 2;

			context.beginPath();
			context.moveTo(centerX, centerY);
			context.lineTo(centerX + vector.x * scale, centerY - vector.y * scale);
			context.strokeStyle = color;
			context.globalAlpha = opacity;
			context.stroke();
		},
		[context, scale, canvasSize],
	);

	const drawConnection = useCallback(
		(v1: Vector, v2: Vector, color = "black") => {
			if (!context) return;

			const centerX = canvasSize.width / 2;
			const centerY = canvasSize.height / 2;

			context.beginPath();
			context.moveTo(centerX + v1.x * scale, centerY - v1.y * scale);
			context.lineTo(centerX + v2.x * scale, centerY - v2.y * scale);
			context.strokeStyle = color;
			context.globalAlpha = 1;
			context.stroke();
		},
		[context, scale, canvasSize],
	);

	useEffect(() => {
		if (!context) return;

		const drawGrid = (context: CanvasRenderingContext2D) => {
			const { width, height } = canvasSize;
			const step = 10;

			context.beginPath();
			for (let x = step; x < width; x += step) {
				context.moveTo(x, 0);
				context.lineTo(x, height);
			}
			for (let y = step; y < height; y += step) {
				context.moveTo(0, y);
				context.lineTo(width, y);
			}
			context.strokeStyle = "lightgray";
			context.globalAlpha = 0.5;
			context.stroke();
		};

		context.clearRect(0, 0, canvasSize.width, canvasSize.height);
		drawGrid(context);

		for (const shape of shapes) {
			for (let i = 0; i < shape.length; i++) {
				drawVector(shape[i].vector, shape[i].color || "black", 0.35);
			}

			const connectionColor =
				selectedShape === shapes.indexOf(shape) ? "red" : "black";

			for (let i = 0; i < shape.length - 1; i++) {
				drawConnection(shape[i].vector, shape[i + 1].vector, connectionColor);
			}
		}
	}, [context, shapes, drawVector, drawConnection, selectedShape, canvasSize]);

	const calculateCenter = (shape: Array<PlottedVector>): Vector => {
		const center = shape.reduce(
			(acc, v) => addVectors(acc, v.vector),
			createVector(0, 0),
		);
		return scaleVector(center, 1 / shape.length);
	};

	const addShape = useCallback(() => {
		const newShapes = [...shapes, []];
		setShapes(newShapes);
		return newShapes.length - 1;
	}, [shapes]);

	const removeShape = (index: number) => {
		const newShapes = shapes.filter((_, i) => i !== index);
		setShapes(newShapes);
	};

	const scaleShape = (shapeIndex: number, scalar: number) => {
		const newShapes = [...shapes];
		const center = calculateCenter(newShapes[shapeIndex]);

		newShapes[shapeIndex] = newShapes[shapeIndex].map((v) => ({
			vector: addVectors(
				scaleVector(subtractVectors(v.vector, center), scalar),
				center,
			),
			color: v.color,
		}));

		setShapes(newShapes);
	};

	const translateShape = (shapeIndex: number, translation: Vector) => {
		const newShapes = [...shapes];
		newShapes[shapeIndex] = newShapes[shapeIndex].map((v) => ({
			vector: addVectors(v.vector, translation),
			color: v.color,
		}));
		setShapes(newShapes);
	};

	const rotateShape = (shapeIndex: number, angle: number) => {
		const newShapes = [...shapes];
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		const center = calculateCenter(newShapes[shapeIndex]);

		newShapes[shapeIndex] = newShapes[shapeIndex].map((v) => {
			const translated = subtractVectors(v.vector, center);
			const rotated = createVector(
				cos * translated.x - sin * translated.y,
				sin * translated.x + cos * translated.y,
			);
			return {
				vector: addVectors(rotated, center),
				color: v.color,
			};
		});

		setShapes(newShapes);
	};

	const duplicateShape = (shapeIndex: number) => {
		const newShapes = [...shapes];

		const newShape = shapes[shapeIndex].map((v) => ({ ...v }));

		const translatedNewShape = newShape.map((v) => ({
			...v,
			vector: addVectors(v.vector, createVector(0.5, 0.5)),
		}));

		newShapes.push(translatedNewShape);
		setShapes(newShapes);
	};

	const addVector = useCallback(
		(shapeIndex: number, vector: Vector, color = "lightgray", opacity = 1) => {
			const newShapes = [...shapes];
			newShapes[shapeIndex].push({ vector, color, opacity });
			setShapes(newShapes);
		},
		[shapes],
	);

	const clearVectors = () => {
		setShapes([]);
	};

	const deselectShape = () => {
		setSelectedShape(null);
	};

	const transformPixelToVector = (x: number, y: number): Vector => {
		if (!context) {
			return createVector(0, 0);
		}
		const centerX = canvasSize.width / 2;
		const centerY = canvasSize.height / 2;

		return createVector((x - centerX) / scale, (centerY - y) / scale);
	};

	const serializeToSVG = (width = 500, height = 500): string => {
		const svgHeader = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
		const svgFooter = "</svg>";

		// Function to scale coordinates to fit the SVG viewBox
		const scaleCoordinate = (value: number, max: number): number => {
			return (value / max) * (width < height ? width : height) * 0.5;
		};

		// Find the maximum absolute value for x and y coordinates
		const maxValue = shapes.flat().reduce((max, vector) => {
			return Math.max(
				max,
				Math.abs(vector.vector.x),
				Math.abs(vector.vector.y),
			);
		}, 0);

		// Generate path elements for each shape
		const pathElements = shapes
			.map((shape) => {
				if (shape.length === 0) return "";

				const pathData = shape
					.map((plotted, index) => {
						const x = scaleCoordinate(plotted.vector.x, maxValue) + width / 2;
						const y = height / 2 - scaleCoordinate(plotted.vector.y, maxValue);
						return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
					})
					.join(" ");

				return `<path d="${pathData}" stroke="${shape[0].color}" fill="none" />`;
			})
			.join("\n");

		// Combine all elements
		return `${svgHeader}\n${pathElements}\n${svgFooter}`;
	};

	return {
		addVector,
		clearVectors,
		addVectors,
		subtractVectors,
		scaleVector,
		normalizeVector,
		vectorLength,
		transformPixelToVector,
		shapes,
		addShape,
		selectShape,
		selectedShape,
		selectVector,
		selectedVector,
		removeShape,
		deselectShape,
		scaleShape,
		translateShape,
		rotateShape,
		duplicateShape,
		serializeToSVG,
		selectShapeWithPointer,
		canvasSize,
	};
};

export { useVectorPlotter, createVector };
