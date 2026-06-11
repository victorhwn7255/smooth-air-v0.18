export default function BriefingProse({ text }: { text: string }) {
  return (
    <section className="border-2 border-black bg-peach p-4">
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.08em]">
        What to tell the cabin
      </div>
      <p className="text-lg leading-relaxed">{text}</p>
    </section>
  );
}
