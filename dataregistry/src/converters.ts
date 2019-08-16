import { Cost, Dataset, MimeType_, URL_ } from "./datasets";
import { CachedObservable } from "./cachedObservable";
import { Observable } from "rxjs";

/**
 * Function that can possibly convert between data type T to
 * data type V.
 *
 * It determines if it is able to convert T, based on it's mimetype
 * and returns a mapping of possible resulting mimetypes and
 * resulting data.
 */
export type Converter<T, U> = (dataset: {
  url: URL_;
  mimeType: MimeType_;
  cost: Cost;
  data: CachedObservable<T>;
}) => Array<{ mimeType: MimeType_; cost: Cost; data: Observable<U> }>;

/**
 * Applies the converter to a dataset iteratively until all mimetypes are filled out.
 *
 * Uses an implementation of Dijkstra's algorithm.
 */
export function applyConverterDataset<T>(
  url: URL_,
  dataset: Dataset<T>,
  converter: Converter<T, T>
): Dataset<T> {
  // mimeTypes that we still need to convert
  let toProcess: Array<{
    mimeType: MimeType_;
    cost: Cost;
    data: CachedObservable<T>;
  }> = [...dataset].map(([mimeType, [cost, data]]) => ({
    mimeType,
    cost,
    data
  }));
  // processed mimetypes
  const processed: Dataset<T> = new Map();
  // We should only process each mimeType once. They will start on the toProcess map
  // and then move to the processed.
  while (toProcess.length !== 0) {
    const { mimeType, cost, data } = toProcess.pop()!;

    // If we already have this mimetype at a lower or equal cost, skip processing it.
    if (processed.has(mimeType) && processed.get(mimeType)![0] <= cost) {
      continue;
    }
    // Otherwise, add it to the processed map
    processed.set(mimeType, [cost, data]);

    // Iterate through its possible conversions and add, caching results
    toProcess = toProcess.concat(
      converter({ cost, data, mimeType, url }).map(
        ({ cost, mimeType, data }) => ({
          cost,
          mimeType,
          data: CachedObservable.from(data)
        })
      )
    );
  }
  return processed;
}

export function combineManyConverters<T, U>(
  ...converters: Array<Converter<T, U>>
): Converter<T, U> {
  return dataset =>
    converters.map(c => c(dataset)).reduce((l, r) => l.concat(r), []);
}
