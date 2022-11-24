import axios from "axios";
import { load } from "cheerio";
import { NextApiRequest } from "next";
import { ApiResponse } from "../../../lib/api";
import Errors from "../../../lib/api/errors";

const weekExp = /v.([1-5]){1,2}/;
const dayExp = /(.){3}[ ]/;

type ExamData = {
    date: Date;
    exams: Exam[];
};

type Exam = {
    type?: string;
    name?: string;
    teacher?: string;

    registered?: Date;
};

const exams = async (req: NextApiRequest, res: ApiResponse<ExamData[]>) => {
    if (req.method == "GET") {
        const schedule = await fetch(
            "https://www.gtc.com/provschema/kalender.asp?klass=T1c"
        );
        const $ = load(await schedule.text());

        const days = $("tr td")
            .map((_, d) => $(d))
            .toArray();

        const texts: string[][] = [];
        for (const d of days) {
            const ts = d.contents().toArray();

            let notEmptyTexts: string[] = [];
            for (const t of ts) {
                let text = $(t).text().trim();

                if (dayExp.test(text)) text = text.substring(4);

                if (text != "" && !weekExp.test(text)) notEmptyTexts.push(text);
            }

            if (notEmptyTexts.length > 0) texts.push(notEmptyTexts);
        }

        const today = new Date();
        const firstDateText = texts[0][0];
        const date = new Date(
            today.getFullYear(),
            +firstDateText.split("/")[1] - 1,
            +firstDateText.split("/")[0] - 1
        );
        if (date > today) date.setFullYear(date.getFullYear() - 1);

        const examData: ExamData[] = [];
        for (const d of days) {
            const ts = d.contents().toArray();

            const content = $(d).text().trim();
            if (content == "" || weekExp.test(content)) continue;

            date.setDate(date.getDate() + 1);

            let exams: Exam[] = [];
            for (let i = 1; i < ts.length; i++) {
                let e: Exam = {};

                if (
                    i == 1 &&
                    ($(ts).get(0) as HTMLElement | undefined)?.tagName == "span"
                )
                    i += 2;

                while (
                    ($(ts).get(i) as HTMLElement | undefined)?.tagName == "br"
                )
                    i++;

                if (
                    ($(ts).get(i) as HTMLElement | undefined)?.tagName == "span"
                ) {
                    e.type = $($(ts).get(i)).text().trim();

                    do i++;
                    while (
                        ($(ts).get(i) as HTMLElement | undefined)?.tagName ==
                        "br"
                    );
                }

                if (
                    ($(ts).get(i) as HTMLElement | undefined)?.tagName ==
                    undefined
                ) {
                    e.name = $($(ts).get(i)).text().trim();

                    do i++;
                    while (
                        ($(ts).get(i) as HTMLElement | undefined)?.tagName ==
                        "br"
                    );
                }

                if (($(ts).get(i) as HTMLElement | undefined)?.tagName == "i") {
                    e.teacher = $($(ts).get(i)).text().trim();

                    do i++;
                    while (
                        ($(ts).get(i) as HTMLElement | undefined)?.tagName ==
                        "br"
                    );
                }

                if (
                    ($(ts).get(i) as HTMLElement | undefined)?.tagName == "div"
                ) {
                    e.teacher = $($(ts).get(i)).text().trim();

                    do i++;
                    while (
                        ($(ts).get(i) as HTMLElement | undefined)?.tagName ==
                        "br"
                    );
                }

                i++;
                if (
                    ($(ts).get(i) as HTMLElement | undefined)?.tagName == "div"
                ) {
                    e.registered = new Date(
                        $($(ts).get(i)).text().trim().substring(22)
                    );

                    do i++;
                    while (
                        ($(ts).get(i) as HTMLElement | undefined)?.tagName ==
                        "br"
                    );
                }

                if (e.type || e.name || e.teacher) exams.push(e);
            }

            if (exams.length > 0)
                examData.push({
                    date: new Date(date),
                    exams,
                });
        }

        res.status(200).json({ data: examData });

        return;
    }

    res.status(405).json({
        error: Errors.MethodNotAllowed(req.method),
    });
};

export default exams;
