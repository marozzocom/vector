import {
	useRef,
	useState,
	type ButtonHTMLAttributes,
	type MouseEventHandler,
} from "react";
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
	Plus,
	RotateCcw,
	RotateCw,
	Shrink,
	Trash,
	Trash2,
	ZoomIn,
	ZoomOut,
} from "lucide-react";

const DEFAULT_ZOOM = 50;
const TRANSLATION_STEP = 0.5;

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

const StyledButton = styled.button`
	background-color: white;
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

type SelectableButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	selected: boolean;
};

const SelectableButton = styled(StyledButton)<SelectableButtonProps>`
	background-color: ${(props) => (props.selected ? "#f00" : "white")};
`;

const App = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [zoom, setZoom] = useState(DEFAULT_ZOOM);
	const [exportOpen, setExportOpen] = useState(false);

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

	const handleAddVector: MouseEventHandler<HTMLCanvasElement> = (event) => {
		if (!canvasRef.current) {
			return;
		}

		if (selectedShape === null) {
			const index = addShape();
			selectShape(index);
			return;
		}

		const xInRelationToCanvas = event.clientX - canvasRef.current.offsetLeft;

		const yInRelationToCanvas = event.clientY - canvasRef.current.offsetTop;

		const vector = transformPixelToVector(
			xInRelationToCanvas,
			yInRelationToCanvas,
		);

		addVector(selectedShape, vector);
	};

	const handleClear = () => {
		deselectShape();
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

	return (
		<Layout>
			<PanelContainer>
				<Panel>
					<StyledButton onClick={handleAddShape} type="button">
						<Plus />
					</StyledButton>
					<StyledButton onClick={handleClear} type="button">
						<Trash2 />
					</StyledButton>
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
					<StyledButton onClick={toggleExport} type="button">
						<Download />
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
							<SelectableButton
								// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
								key={index}
								onClick={() => selectShape(index)}
								type="button"
								selected={selectedShape === index}
							>
								{index}
							</SelectableButton>
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
						<StyledButton type="button" onClick={handleRotateClockwise}>
							<RotateCw />
						</StyledButton>
						<StyledButton type="button" onClick={handleRotateCounterClockwise}>
							<RotateCcw />
						</StyledButton>
						<StyledButton onClick={handleDuplicateShape} type="button">
							<Copy />
						</StyledButton>
						<StyledButton onClick={handleRemoveShape} type="button">
							<Trash />
						</StyledButton>
					</Panel>
				)}
			</PanelContainer>
			<CanvasContainer>
				<StyledCanvas ref={canvasRef} onClick={handleAddVector} />
			</CanvasContainer>
		</Layout>
	);
};

export default App;
