import { useCallback, useEffect, useState, type RefObject } from "react";

// Vector type and operations
type Vector = { x: number; y: number };

// Plotted vector type
type PlottedVector = {
	vector: Vector;
	color: string;
};

// Shapes type
type Shapes = Array<Array<PlottedVector>>;

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
	const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
	const [shapes, setShapes] = useState<Shapes>([]);
	const [selectedShape, setSelectedShape] = useState<number | null>(null);

	const selectShape = (index: number) => {
		setSelectedShape(index);
	};

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const context = canvas.getContext("2d");
		if (!context) return;

		setCtx(context);

		// Set canvas size
		canvas.width = 400;
		canvas.height = 400;
	}, [canvasRef]);

	const drawVector = useCallback(
		(vector: Vector, color: string) => {
			if (!ctx) return;

			const centerX = ctx.canvas.width / 2;
			const centerY = ctx.canvas.height / 2;

			ctx.beginPath();
			ctx.moveTo(centerX, centerY);
			ctx.lineTo(centerX + vector.x * scale, centerY - vector.y * scale);
			ctx.strokeStyle = color;
			ctx.stroke();
		},
		[ctx, scale],
	);

	const drawConnection = useCallback(
		(v1: Vector, v2: Vector, color = "black") => {
			if (!ctx) return;

			const centerX = ctx.canvas.width / 2;
			const centerY = ctx.canvas.height / 2;

			ctx.beginPath();
			ctx.moveTo(centerX + v1.x * scale, centerY - v1.y * scale);
			ctx.lineTo(centerX + v2.x * scale, centerY - v2.y * scale);
			ctx.strokeStyle = color;
			ctx.stroke();
		},
		[ctx, scale],
	);

	useEffect(() => {
		if (!ctx) return;

		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		drawCoordinateSystem(ctx);

		for (const shape of shapes) {
			for (let i = 0; i < shape.length; i++) {
				drawVector(shape[i].vector, shape[i].color);
			}

			const connectionColor =
				selectedShape === shapes.indexOf(shape) ? "red" : "black";

			for (let i = 0; i < shape.length - 1; i++) {
				drawConnection(shape[i].vector, shape[i + 1].vector, connectionColor);
			}
		}
	}, [ctx, shapes, drawVector, drawConnection, selectedShape]);

	const drawCoordinateSystem = (context: CanvasRenderingContext2D) => {
		const { width, height } = context.canvas;
		context.beginPath();
		context.moveTo(width / 2, 0);
		context.lineTo(width / 2, height);
		context.moveTo(0, height / 2);
		context.lineTo(width, height / 2);
		context.strokeStyle = "black";
		context.stroke();
	};

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
		(shapeIndex: number, vector: Vector, color = "lightgray") => {
			const newShapes = [...shapes];
			newShapes[shapeIndex].push({ vector, color });
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
		if (!ctx) {
			return createVector(0, 0);
		}
		const centerX = ctx.canvas.width / 2;
		const centerY = ctx.canvas.height / 2;

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
		removeShape,
		deselectShape,
		scaleShape,
		translateShape,
		rotateShape,
		duplicateShape,
		serializeToSVG,
	};
};

export { useVectorPlotter, createVector };
