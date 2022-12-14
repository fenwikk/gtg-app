import { NextApiRequest } from "next";
import Skola24, {
    GroupLessons,
    Lesson,
    ParseSchedule,
    ScheduleData,
    SortSchedule,
} from "skola24";
import { ApiResponse } from "../../../lib/api";
import Errors from "../../../lib/api/errors";

type RequestData = {
    selectionGuid: string;
    week: number;
    day?: 0 | 1 | 2 | 3 | 4 | 5;
    year?: number;
    parsed?: boolean;
    sort?: boolean;
    group?: boolean;
    withColors?: boolean;
};

const lessons = async (
    req: NextApiRequest,
    res: ApiResponse<ScheduleData | Lesson[] | Lesson[][]>
) => {
    if (req.method == "GET") {
        const data: RequestData = {
            selectionGuid: req.query.selectionGuid as string,
            week: +(req.query.week || 0),
            day:
                req.query.day != undefined
                    ? (+req.query.day as 0 | 1 | 2 | 3 | 4 | 5)
                    : undefined,
            year:
                req.query.year != undefined
                    ? +(req.query.year || 0)
                    : undefined,
            parsed: req.query.parsed != "false",
            sort: req.query.parsed != "false",
            group: req.query.group != "false",
            withColors: req.query.withColors != "false",
        };

        const session = await Skola24.connect(
            "goteborgstekniskacollege.skola24.se"
        );

        const lessons = await session.getSchedule(
            data.selectionGuid as string,
            +(data.week || 0),
            data.day != undefined
                ? (+data.day as 0 | 1 | 2 | 3 | 4 | 5)
                : undefined,
            data.year != undefined ? +(data.year || 0) : undefined
        );

        if (data.parsed) {
            let parsedLessons = ParseSchedule(
                lessons,
                +(data.week || 0),
                +(data.year || new Date().getFullYear()),
                data.withColors
            );

            if (data.sort) parsedLessons = SortSchedule(parsedLessons);

            res.status(200).json({
                data: data.group ? GroupLessons(parsedLessons) : parsedLessons,
            });
        } else {
            res.status(200).json({
                data: lessons,
            });
        }

        return;
    }

    res.status(405).json({
        error: Errors.MethodNotAllowed(req.method),
    });
};

export default lessons;
