import { DEFAULT_CHARACTER } from "./CharacterData";

export default function CharacterCustomizer() {

  return (
    <div className="p-6 text-white">
      <h2 className="text-3xl font-bold mb-4">
        OPERATORS
      </h2>

      <pre>
        {JSON.stringify(
          DEFAULT_CHARACTER,
          null,
          2
        )}
      </pre>
    </div>
  );
}
