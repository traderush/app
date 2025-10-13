import Canvas from "@/components/canvas/Canvas";

export default function Page() {
    return (
      <div className="w-screen h-screen top-0 left-0 absolute p-20">
        <Canvas showProbabilities={true} />
      </div>
    );
  }
  