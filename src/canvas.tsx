import { useCallback, useRef, useState, type MouseEventHandler } from "react";
import { styled } from "@linaria/react";
import { useVectorPlotter } from "./use-vector-plotter";
import {
	ArrowBigDown,
	ArrowBigLeft,
	ArrowBigRight,
	ArrowBigUp,
	Copy,
	Download,
	Expand,
	FilePlus,
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

const debounce = <T extends unknown[]>(
	func: (...args: T) => void,
	wait = 200,
) => {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	return (...args: T) => {
		const later = () => {
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			clearTimeout(timeout!);
			func(...args);
		};

		if (timeout !== null) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(later, wait);
	};
};

const DEFAULT_ZOOM = 50;
const TRANSLATION_STEP = 0.5;
const DEBOUNCE_RATE = 7;

const Separator = styled.div`
	border-left: 1px solid #ddd;
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
	background-color: #f0f0f0;
	border-radius: 1rem;
	min-height: 2rem;
	flex-wrap: wrap;
	padding: 1rem;
	align-items: center;
`;

const PanelContainer = styled.div`
	display: flex;
	flex-direction: column;
	gap: 1rem;
`;

const StyledCanvas = styled.canvas`
  border: 1px solid red;
`;

const Layout = styled.div`
	display: flex;
	flex-direction: column;
	height: 100vh;
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

const App = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [zoom, setZoom] = useState(DEFAULT_ZOOM);
	const [exportOpen, setExportOpen] = useState(false);
	const [drawingMode, setDrawingMode] = useState<"point" | "freehand">("point");

	const debounceRef = useRef<((e: MouseEvent) => void) | null>();

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
	} = useVectorPlotter(canvasRef, zoom);

	const handleAddShape = () => {
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

		removeShape(selectedShape);
	};

	const debouncedHandleFreehandDrawing = useCallback(
		(event: MouseEvent) => {
			if (!debounceRef.current) {
				debounceRef.current = debounce((e: MouseEvent) => {
					if (!canvasRef.current || selectedShape === null) return;

					const xInRelationToCanvas = e.clientX - canvasRef.current.offsetLeft;
					const yInRelationToCanvas = e.clientY - canvasRef.current.offsetTop;

					const vector = transformPixelToVector(
						xInRelationToCanvas,
						yInRelationToCanvas,
					);

					addVector(selectedShape, vector);
				}, DEBOUNCE_RATE);
			}
			debounceRef.current(event);
		},
		[selectedShape, transformPixelToVector, addVector],
	);

	const stopFreehandDrawing = () => {
		canvasRef.current?.removeEventListener(
			"mousemove",
			debouncedHandleFreehandDrawing,
		);
	};

	const handleAddVector: MouseEventHandler<HTMLCanvasElement> = (event) => {
		if (!canvasRef.current) {
			return;
		}

		if (selectedShape === null) {
			const index = addShape();
			selectShape(index);
			return;
		}

		if (drawingMode === "point") {
			const xInRelationToCanvas = event.clientX - canvasRef.current.offsetLeft;

			const yInRelationToCanvas = event.clientY - canvasRef.current.offsetTop;

			const vector = transformPixelToVector(
				xInRelationToCanvas,
				yInRelationToCanvas,
			);

			addVector(selectedShape, vector);
			return;
		}

		canvasRef.current.addEventListener(
			"mousemove",
			debouncedHandleFreehandDrawing,
		);
		window.addEventListener("mouseup", stopFreehandDrawing);
	};

	const handleClear = () => {
		deselectShape();
		clearVectors();

		debounceRef.current = null;

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

	const choosePoint = () => setDrawingMode("point");
	const chooseFreehand = () => setDrawingMode("freehand");

	return (
		<Layout>
			<PanelContainer>
				<Panel>
					<StyledButton onClick={handleAddShape} type="button">
						<Plus />
					</StyledButton>
					<Separator />
					<StyledButton
						onClick={choosePoint}
						type="button"
						selected={drawingMode === "point"}
					>
						<PenTool />
					</StyledButton>
					<StyledButton
						onClick={chooseFreehand}
						type="button"
						selected={drawingMode === "freehand"}
					>
						<Pencil />
					</StyledButton>
					<Separator />
					<StyledButton
						onClick={() => setZoom((prev) => prev + 5)}
						type="button"
					>
						<ZoomIn />
					</StyledButton>
					<StyledButton
						onClick={() => setZoom((prev) => prev - 5)}
						type="button"
					>
						<ZoomOut />
					</StyledButton>
					<Separator />
					<StyledButton onClick={toggleExport} type="button">
						<Download />
					</StyledButton>
					<Separator />
					<StyledButton onClick={handleClear} type="button">
						<FilePlus />
					</StyledButton>
				</Panel>
				{exportOpen && (
					<Panel>
						<StyledTextarea readOnly value={serializeToSVG()} />
					</Panel>
				)}
				{shapes.length > 0 && (
					<Panel>
						{shapes.map((_, index) => (
							<StyledButton
								// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
								key={index}
								onClick={() => selectShape(index)}
								type="button"
								selected={selectedShape === index}
							>
								{index}
							</StyledButton>
						))}
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
						<StyledButton onClick={handleRemoveShape} type="button">
							<Trash2 />
						</StyledButton>
					</Panel>
				)}
			</PanelContainer>
			<CanvasContainer>
				<StyledCanvas ref={canvasRef} onMouseDown={handleAddVector} />
			</CanvasContainer>
		</Layout>
	);
};

export default App;
