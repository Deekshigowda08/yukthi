"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Sidebar from "../sidebar/page";
import { Button } from "../ui/button";
import TaskDecider from "../Tasks/TaskDecider";
import Content from "./Content";
import ChapterNotFound from "./ChapterNotFound";
import ChapterError from "./ChapterError";
import ChapterLoading from "./ChapterLoading";
import { toast } from "sonner";
import { loader } from "../ui/Custom/ToastLoader";

const Page = ({ chapter, roadmapId }) => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const subtopicParam = searchParams.get("subtopic");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [chapterData, setChapterData] = useState(null);
    const [notFound, setNotFound] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [roadmap, setRoadmap] = useState({});
    const { showLoader, hideLoader } = loader();

    async function getRoadmap() {
        try {
            const response = await fetch(`/api/roadmap/${roadmapId}`);
            if (response.ok) {
                const data = await response.json();
                setRoadmap(data);
                return data;
            }

            toast.error("Roadmap not found");
            return null;
        } catch (error) {
            console.error("Error fetching roadmap", error);
            setError("Failed to fetch roadmap data. Please try again later.");
            toast.error(
                "Failed to fetch roadmap data. Please try again later."
            );
            return null;
        }
    }

    async function fetchChapter() {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/get-chapter/${roadmapId}/${chapter}`
            );

            if (response.status === 404) {
                const roadmap = await getRoadmap();

                if (!roadmap) {
                    setNotFound(true);
                    setIsLoading(false);
                    return;
                }

                const chapterDetails = roadmap.chapters.find(
                    (ch) => ch.chapterNumber === Number(chapter)
                );

                if (!chapterDetails) {
                    setNotFound(true);
                    setIsLoading(false);
                    return;
                }
                setGenerating(true);

                const chapterResponse = await fetch(`/api/chapter-prompt`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt: chapterDetails }),
                });

                if (!chapterResponse.ok) {
                    throw new Error("Failed to generate chapter content");
                }
                setGenerating(false);

                const chapterData = await chapterResponse.json();
                setChapterData(chapterData.text);
                console.log(chapterData.text);
                setTasks(chapterData.text.tasks);
                await addChapter(chapterData.text);
            } else if (response.ok) {
                const data = await response.json();
                setChapterData(data.chapter.content);
                console.log(data.chapter.tasks);

                setTasks(data.chapter.tasks);
            } else {
                throw new Error(`Failed to fetch chapter: ${response.status}`);
            }
        } catch (error) {
            console.error("Error fetching chapter:", error);
            setError("Failed to load chapter content. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    }

    async function addChapter(chapterContent) {
        try {
            const response = await fetch(`/api/get-chapter`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roadmapId,
                    chapter,
                    content: chapterContent,
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to save chapter: ${response.status}`);
            }
        } catch (error) {
            console.error("Error adding chapter:", error);
        }
    }

    const updateUrl = (index) => {
        const params = new URLSearchParams(searchParams);
        params.set("subtopic", index.toString());
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleNext = () => {
        if (
            selectedIndex <
            (chapterData?.subtopics?.length || 0) + tasks?.length - 1
        ) {
            const newIndex = selectedIndex + 1;
            setSelectedIndex(newIndex);
            updateUrl(newIndex);
            window.scrollTo(0, 0);
        } else if (
            selectedIndex ===
                chapterData?.subtopics?.length + tasks?.length - 1 &&
            chapter < roadmap.chapters.length
        ) {
            showLoader();
            const params = new URLSearchParams(searchParams);
            params.set("subtopic", 0);
            router.push(
                `/chapter-test/${roadmapId}/${
                    Number(chapter) + 1
                }/?${params.toString()}`,
                { scroll: false }
            );
        }
    };

    const handlePrev = () => {
        if (selectedIndex > 0) {
            const newIndex = selectedIndex - 1;
            setSelectedIndex(newIndex);
            updateUrl(newIndex);
            window.scrollTo(0, 0);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "ArrowRight") {
            handleNext();
        } else if (e.key === "ArrowLeft") {
            handlePrev();
        }
    };

    useEffect(() => {
        if (subtopicParam && chapterData && chapterData.subtopics) {
            const parsedIndex = parseInt(subtopicParam, 10);
            if (
                !isNaN(parsedIndex) &&
                parsedIndex >= 0 &&
                parsedIndex < chapterData.subtopics.length + tasks.length
            ) {
                setSelectedIndex(parsedIndex);
            }
        }
    }, [subtopicParam, chapterData]);

    useEffect(() => {
        if (roadmapId && chapter) {
            fetchChapter();
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [roadmapId, chapter]);

    useEffect(() => {
        const rm = { ...roadmap }; //temporary variable to hold roadmap
        for (const element of tasks) {
            const type = element.type.split("-");
            let displayType = "";
            for (const word of type) {
                displayType += word[0].toUpperCase() + word.slice(1) + " ";
            }
            if (rm.chapters) {
                rm.chapters[Number(chapter - 1)].contentOutline.length < //condition to resolve duplicate render issue
                    chapterData.subtopics.length + tasks.length &&
                    rm.chapters[Number(chapter - 1)]?.contentOutline.push(
                        `Task > ${displayType}`
                    );
            }
        }
    }, [roadmap, tasks]);

    useEffect(() => {
        getRoadmap();
        hideLoader();
    }, []);

    if (isLoading) {
        return (
            <ChapterLoading
                roadmap={roadmap}
                roadmapId={roadmapId}
                isGenerating={isGenerating}
            ></ChapterLoading>
        );
    }

    if (error) {
        return <ChapterError fetchChapter={fetchChapter} error={error} />;
    }
    if (notFound) {
        return <ChapterNotFound roadmapId={roadmapId} />;
    }

    if (
        !chapterData ||
        !chapterData.subtopics ||
        chapterData.subtopics.length === 0
    ) {
        return (
            <div className="min-h-screen bg-background p-6 flex items-center justify-center">
                <p className="text-lg text-gray-500">
                    No content available for this chapter.
                </p>
            </div>
        );
    }

    const subtopics = chapterData.subtopics || [];
    const currentTopic = subtopics[selectedIndex] || {};

    return (
        <div className="min-h-[calc(100vh-64px)] bg-background ">
            <div className="flex flex-col md:flex-row">
                <Sidebar roadmap={roadmap} id={roadmapId} />
                <div className="flex-1 p-8 lg:ml-96 lg:w-[60vw] max-sm:p-4 bg-background ">
                    {chapterData.chapterTitle && (
                        <h1 className="text-4xl font-bold mb-4">
                            {chapterData.chapterTitle}
                        </h1>
                    )}

                    {selectedIndex < chapterData.subtopics.length ? (
                        <div className="mb-6">
                            <div className="flex justify-between text-sm text-gray-500 mb-2">
                                <span>
                                    Topic {selectedIndex + 1} of{" "}
                                    {subtopics.length}
                                </span>
                                <span>
                                    {Math.round(
                                        ((selectedIndex + 1) /
                                            subtopics.length) *
                                            100
                                    )}
                                    % complete
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{
                                        width: `${
                                            ((selectedIndex + 1) /
                                                subtopics.length) *
                                            100
                                        }%`,
                                    }}
                                ></div>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-6">
                            <div className="flex justify-between text-sm text-gray-500 mb-2">
                                <span>
                                    Task {selectedIndex - subtopics.length + 1}{" "}
                                    of {tasks.length}
                                </span>
                                <span>
                                    {Math.round(
                                        ((selectedIndex -
                                            subtopics.length +
                                            1) /
                                            tasks.length) *
                                            100
                                    )}
                                    % complete
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{
                                        width: `${
                                            ((selectedIndex -
                                                subtopics.length +
                                                1) /
                                                tasks.length) *
                                            100
                                        }%`,
                                    }}
                                ></div>
                            </div>
                        </div>
                    )}
                    {selectedIndex < subtopics.length ? (
                        <Content currentTopic={currentTopic}></Content>
                    ) : (
                        <div>
                            <TaskDecider
                                roadmapId={roadmapId}
                                chapterNumber={chapter}
                                task={tasks[selectedIndex - subtopics.length]}
                            ></TaskDecider>
                        </div>
                    )}

                    <div className="flex justify-between mt-12 mb-4">
                        <Button
                            variant={"outline"}
                            onClick={handlePrev}
                            disabled={selectedIndex === 0}
                        >
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            <span>Previous</span>
                        </Button>

                        <Button
                            onClick={handleNext}
                            variant={"outline"}
                            disabled={
                                selectedIndex ===
                                    chapterData?.subtopics?.length +
                                        tasks?.length -
                                        1 && chapter >= roadmap.chapters.length
                            }
                        >
                            <span>
                                {selectedIndex ===
                                chapterData?.subtopics?.length - 1
                                    ? "Go to task"
                                    : selectedIndex ===
                                      chapterData?.subtopics?.length +
                                          tasks?.length -
                                          1
                                    ? "Next Chapter"
                                    : "Next"}
                            </span>
                            <ArrowRight className="h-5 w-5 ml-2" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Page;
