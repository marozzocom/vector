import { useCallback, useRef, useState, type MouseEventHandler } from "react";
import { styled } from "@linaria/react";
import { useVectorPlotter } from "./use-vector-plotter";
import {
	ArrowBigDown,
	ArrowBigLeft,
	ArrowBigRight,
	ArrowBigUp,
	CircleOff,
	Copy,
	Download,
	Expand,
	FilePlus,
	MousePointer2,
	Pencil,
	PenTool,
	Plus,
	RotateCcw,
	RotateCw,
	Shrink,
	Trash2,
	ZoomIn,
	ZoomOut,
} from "lucide-react";

const DEFAULT_ZOOM = 50;
const ZOOM_STEP = 5;
const TRANSLATION_STEP = 0.5;

const Separator = styled.div`
	border-left: 1px solid rgb(0, 0, 0, 0.25);
	height: 1rem;
`;

const CanvasContainer = styled.div`
  display: grid;
  place-content: center;
	flex-basis: 100%;
`;

const Panel = styled.div`
	display: flex;
	justify-content: center;
	gap: 1rem;
	background-color: rgb(128 128 24 / 0.45);
	box-shadow: 0 0 0.5rem rgba(0, 0, 0, 0.05);
	border-radius: 1rem;
	min-height: 2rem;
	flex-wrap: wrap;
	padding: 1rem;
	align-items: center;
	backdrop-filter: blur(0.125rem);
`;

const PanelContainer = styled.div`
	display: flex;
	flex-direction: column;
	gap: 1rem;
	position: fixed;
	top: 1rem;
	left: 1rem;
`;

const StyledCanvas = styled.canvas`
  box-shadow: 0 0 8rem 2rem rgb(255 255 255 / 1) inset;
`;

const Layout = styled.div`
	display: flex;
	flex-direction: column;
	min-height: 100vh;
`;

const StyledButton = styled.button<{
	selected?: boolean;
}>`
	background-color: ${(props) => (props.selected ? "#f00" : "white")};
	border:none;
	border-radius: 0.5rem;
	box-shadow: 0 0 0.5rem rgba(0, 0, 0, 0.1);
	display: grid;
	place-content: center;
	min-height: 2rem;
	min-width: 2rem;
	transition: background-color 0.2s;

	&:hover {
		background-color: #faa;
	}
`;

const StyledTextarea = styled.textarea`
	border: none;
	border-radius: 0.5rem;
	box-shadow: 0 0 0.5rem rgba(0, 0, 0, 0.1);
	font-family: monospace;
	font-size: 0.8rem;
	height: 10rem;
	width: 100%;
`;

type Modes = "freehand" | "point" | "selectShape";

const App = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [zoom, setZoom] = useState(DEFAULT_ZOOM);
	const [exportOpen, setExportOpen] = useState(false);
	const [mode, setMode] = useState<Modes>("freehand");

	const toggleExport = () => setExportOpen((prev) => !prev);

	const {
		addVector,
		clearVectors,
		transformPixelToVector,
		addShape,
		shapes,
		selectedShape,
		selectShape,
		removeShape,
		deselectShape,
		scaleShape,
		translateShape,
		rotateShape,
		duplicateShape,
		serializeToSVG,
		selectShapeWithPointer,
	} = useVectorPlotter(canvasRef, zoom);

	const handleAddShape = () => {
		if (shapes[shapes.length - 1]?.length === 0) {
			return;
		}

		const index = addShape();
		selectShape(index);
	};

	const handleRemoveShape = () => {
		if (selectedShape === null) {
			return;
		}

		if (shapes.length === 1) {
			handleClear();
			return;
		}

		if (shapes.length > 1) {
			selectShape(selectedShape - 1);
		} else {
			deselectShape();
		}

		removeShape(selectedShape);
	};

	const handleDeselectShape = () => {
		deselectShape();

		setMode("selectShape");
	};

	const handleFreehandDrawing = useCallback(
		(event: PointerEvent | TouchEvent) => {
			if (!canvasRef.current || selectedShape === null || mode !== "freehand") {
				return;
			}

			const getCoordinates = (e: PointerEvent | TouchEvent) => {
				if (!canvasRef.current) return { x: 0, y: 0 };
				const canvas = canvasRef.current;
				const rect = canvas.getBoundingClientRect();
				const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
				const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
				return {
					x: clientX - rect.left,
					y: clientY - rect.top,
				};
			};

			const { x, y } = getCoordinates(event);
			const vector = transformPixelToVector(x, y);

			// requestAnimationFrame(() => {
			addVector(selectedShape, vector);
			// Add any additional redraw logic here if needed
			// });

			if (event.cancelable) {
				event.preventDefault();
			}
		},
		[selectedShape, transformPixelToVector, addVector, mode],
	);

	const startFreehandDrawing = useCallback(() => {
		window.addEventListener("pointermove", handleFreehandDrawing);
		window.addEventListener("touchmove", handleFreehandDrawing);
	}, [handleFreehandDrawing]);

	const stopFreehandDrawing = useCallback(() => {
		window.removeEventListener("pointermove", handleFreehandDrawing);
		window.removeEventListener("touchmove", handleFreehandDrawing);
	}, [handleFreehandDrawing]);

	const handleCanvasInteraction: MouseEventHandler<HTMLCanvasElement> = (
		event,
	) => {
		if (!canvasRef.current) {
			return;
		}

		if (mode === "selectShape") {
			const xInRelationToCanvas = event.clientX - canvasRef.current.offsetLeft;
			const yInRelationToCanvas = event.clientY - canvasRef.current.offsetTop;

			const vector = transformPixelToVector(
				xInRelationToCanvas,
				yInRelationToCanvas,
			);

			const index = selectShapeWithPointer(vector, 0.1);

			if (index !== -1) {
				selectShape(index);
			}

			return;
		}

		if (selectedShape === null) {
			const index = addShape();
			selectShape(index);
			return;
		}

		if (mode === "point") {
			const xInRelationToCanvas = event.clientX - canvasRef.current.offsetLeft;

			const yInRelationToCanvas = event.clientY - canvasRef.current.offsetTop;

			const vector = transformPixelToVector(
				xInRelationToCanvas,
				yInRelationToCanvas,
			);

			addVector(selectedShape, vector);
			return;
		}

		if (mode === "freehand") {
			startFreehandDrawing();
			window.addEventListener("pointerup", stopFreehandDrawing, { once: true });
			window.addEventListener("touchend", stopFreehandDrawing, { once: true });
		}
	};

	const handleClear = () => {
		selectShape(0);
		clearVectors();

		setZoom(DEFAULT_ZOOM);
	};

	const handleMakeSmaller = () => {
		if (selectedShape === null) {
			return;
		}

		scaleShape(selectedShape, 0.9);
	};

	const handleMakeBigger = () => {
		if (selectedShape === null) {
			return;
		}

		scaleShape(selectedShape, 1.1);
	};

	const handleMoveUp = () => {
		if (selectedShape === null) {
			return;
		}

		translateShape(selectedShape, { x: 0, y: TRANSLATION_STEP });
	};

	const handleMoveRight = () => {
		if (selectedShape === null) {
			return;
		}

		translateShape(selectedShape, { x: TRANSLATION_STEP, y: 0 });
	};

	const handleMoveDown = () => {
		if (selectedShape === null) {
			return;
		}

		translateShape(selectedShape, { x: 0, y: -TRANSLATION_STEP });
	};

	const handleMoveLeft = () => {
		if (selectedShape === null) {
			return;
		}

		translateShape(selectedShape, { x: -TRANSLATION_STEP, y: 0 });
	};

	const handleRotateClockwise = () => {
		if (selectedShape === null) {
			return;
		}

		rotateShape(selectedShape, -Math.PI / 8);
	};

	const handleRotateCounterClockwise = () => {
		if (selectedShape === null) {
			return;
		}

		rotateShape(selectedShape, Math.PI / 8);
	};

	const handleDuplicateShape = () => {
		if (selectedShape === null) {
			return;
		}

		duplicateShape(selectedShape);
	};

	const handleZoomIn = () => {
		setZoom((prev) => prev + ZOOM_STEP);
	};

	const handleZoomOut = () => {
		setZoom((prev) => prev - ZOOM_STEP);
	};

	const choosePoint = () => setMode("point");
	const chooseFreehand = () => setMode("freehand");
	const chooseSelectShape = () => setMode("selectShape");

	const disableClear = shapes.length === 1 && shapes[0].length === 0;
	const disableRemove =
		selectedShape === null || (shapes.length === 1 && shapes[0].length === 0);
	const disableDeselect = selectedShape === null;

	return (
		<Layout>
			<PanelContainer>
				<Panel>
					<StyledButton onClick={handleAddShape} type="button">
						<Plus />
					</StyledButton>
					<Separator />
					<StyledButton
						onClick={chooseSelectShape}
						type="button"
						selected={mode === "selectShape"}
					>
						<MousePointer2 />
					</StyledButton>
					<Separator />
					<StyledButton
						onClick={choosePoint}
						type="button"
						selected={mode === "point"}
					>
						<PenTool />
					</StyledButton>
					<StyledButton
						onClick={chooseFreehand}
						type="button"
						selected={mode === "freehand"}
					>
						<Pencil />
					</StyledButton>
					<Separator />
					<StyledButton onClick={handleZoomIn} type="button">
						<ZoomIn />
					</StyledButton>
					<StyledButton onClick={handleZoomOut} type="button">
						<ZoomOut />
					</StyledButton>
					<Separator />
					<StyledButton onClick={toggleExport} type="button">
						<Download />
					</StyledButton>
					<Separator />
					<StyledButton
						onClick={handleClear}
						type="button"
						disabled={disableClear}
					>
						<FilePlus />
					</StyledButton>
				</Panel>
				{exportOpen && (
					<Panel>
						<StyledTextarea readOnly value={serializeToSVG()} />
					</Panel>
				)}
				{selectedShape !== null && (
					<Panel>
						<StyledButton type="button" onClick={handleMakeSmaller}>
							<Shrink />
						</StyledButton>
						<StyledButton type="button" onClick={handleMakeBigger}>
							<Expand />
						</StyledButton>
						<Separator />
						<StyledButton type="button" onClick={handleMoveLeft}>
							<ArrowBigLeft />
						</StyledButton>
						<StyledButton type="button" onClick={handleMoveRight}>
							<ArrowBigRight />
						</StyledButton>
						<StyledButton type="button" onClick={handleMoveUp}>
							<ArrowBigUp />
						</StyledButton>
						<StyledButton type="button" onClick={handleMoveDown}>
							<ArrowBigDown />
						</StyledButton>
						<Separator />
						<StyledButton type="button" onClick={handleRotateClockwise}>
							<RotateCw />
						</StyledButton>
						<StyledButton type="button" onClick={handleRotateCounterClockwise}>
							<RotateCcw />
						</StyledButton>
						<Separator />
						<StyledButton onClick={handleDuplicateShape} type="button">
							<Copy />
						</StyledButton>
						<StyledButton
							type="button"
							onClick={handleDeselectShape}
							disabled={disableDeselect}
						>
							<CircleOff />
						</StyledButton>
						<Separator />
						<StyledButton
							onClick={handleRemoveShape}
							type="button"
							disabled={disableRemove}
						>
							<Trash2 />
						</StyledButton>
					</Panel>
				)}
			</PanelContainer>
			<CanvasContainer>
				<StyledCanvas ref={canvasRef} onPointerDown={handleCanvasInteraction} />
			</CanvasContainer>
		</Layout>
	);
};

export default App;
